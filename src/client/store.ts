import { analyze, sequenceOf, PROFILE_BANDS, type EmbeddingDims, type SequenceFrame } from './engine'
import type { MotionMode, SpeedLevel } from './motion'
import type {
  NebulaFace,
  NebulaPoint,
  NebulaSettings,
  PanelSnapshot,
  RoamFrame,
} from './types'

export const NEBULA_KIND = 'nebula'
export const NEBULA_ID = 'dsh-spiral'
export const NEBULA_ADDRESS = 'dsh-resource://nebula/panel'

const MAX_POINTS = 72
const FRAME_MS = 220
const DEDUPE_WINDOW_MS = 15_000
/**
 * Storage keys deliberately keep the historical `dsh-nebula` prefix: the package
 * was renamed to dsh-spiral, and changing the keys would silently orphan every
 * star and every setting already saved in a user's browser.
 */
const SETTINGS_KEY = 'dsh-nebula:settings:v1'
const HISTORY_PREFIX = 'dsh-nebula:history:v1:'

export const DEFAULT_SETTINGS: NebulaSettings = {
  enabled: true,
  autoOpen: true,
  dims: 8192,
  palette: 0,
  persist: true,
  motion: 'full',
  speed: 'mid',
}

export interface StoreHost {
  settings(): NebulaSettings
  requestOpen(sessionId: string): void
  requestHide(): void
  setEnabled(value: boolean): void
  setAutoOpen(value: boolean): void
  setDims(dims: EmbeddingDims): void
  setPalette(palette: number): void
  setPersist(value: boolean): void
  setMotion(value: MotionMode): void
  setSpeed(value: SpeedLevel): void
}

/* ------------------------------------------------------------- persistence */

function encodeBytes(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function decodeBytes(text: string): Uint8Array {
  const binary = atob(text)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

/** Quantize the 0..1 silhouette to one byte per band. */
function encodeProfile(profile: Float32Array): Uint8Array {
  const out = new Uint8Array(profile.length)
  for (let i = 0; i < profile.length; i++) {
    out[i] = Math.max(0, Math.min(255, Math.round(profile[i]! * 255)))
  }
  return out
}

/** Quantize the -1..1 signed profile to one byte per band. */
function encodeSigned(profile: Float32Array): Uint8Array {
  const out = new Uint8Array(profile.length)
  for (let i = 0; i < profile.length; i++) {
    out[i] = Math.max(0, Math.min(255, Math.round((profile[i]! * 0.5 + 0.5) * 255)))
  }
  return out
}

function decodeProfile(bytes: Uint8Array): Float32Array {
  const out = new Float32Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i]! / 255
  return out
}

function decodeSigned(bytes: Uint8Array): Float32Array {
  const out = new Float32Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) out[i] = (bytes[i]! / 255) * 2 - 1
  return out
}

interface StoredPoint {
  readonly id: string
  readonly text: string
  readonly time: number
  readonly capturedAt?: number
  readonly profile: string
  readonly signed?: string
  readonly axis?: readonly number[]
  readonly mapX: number
  readonly mapY: number
  readonly schemeBase: number
  readonly magnitude?: number
  readonly tokens?: number
}

function storageAvailable(): boolean {
  try {
    const probe = '__dsh_nebula_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

function storedToPoint(stored: StoredPoint): NebulaPoint | undefined {
  if (typeof stored?.id !== 'string' || typeof stored.text !== 'string') return undefined
  const text = stored.text.slice(0, 4000)
  try {
    const profile = stored.profile ? decodeBytes(stored.profile) : new Uint8Array()
    const signed = stored.signed ? decodeBytes(stored.signed) : new Uint8Array()
    if (profile.length === PROFILE_BANDS) {
      const axis: [number, number, number] = [
        Number(stored.axis?.[0]) || 0,
        Number(stored.axis?.[1]) || 0,
        Number(stored.axis?.[2]) || 0,
      ]
      return {
        id: stored.id,
        text,
        time: Number(stored.time) || Date.now(),
        capturedAt: Number(stored.capturedAt) || Number(stored.time) || Date.now(),
        profile: decodeProfile(profile),
        signed: signed.length === PROFILE_BANDS ? decodeSigned(signed) : new Float32Array(PROFILE_BANDS),
        axis,
        mapX: Number(stored.mapX) || 0,
        mapY: Number(stored.mapY) || 0,
        schemeBase: Math.abs(Math.trunc(Number(stored.schemeBase) || 0)) % 6,
        magnitude: Math.min(1, Math.max(0.3, Number(stored.magnitude) || 0.7)),
        tokens: Math.max(0, Math.trunc(Number(stored.tokens) || 0)),
      }
    }
  } catch {
    // Fall through and re-derive from text.
  }
  const derived = analyze(text)
  return {
    id: stored.id,
    text,
    time: Number(stored.time) || Date.now(),
    capturedAt: Number(stored.capturedAt) || Number(stored.time) || Date.now(),
    profile: derived.profile,
    signed: derived.signed,
    axis: derived.axis,
    mapX: derived.mapX,
    mapY: derived.mapY,
    schemeBase: derived.schemeBase,
    magnitude: derived.magnitude,
    tokens: derived.tokens,
  }
}

function loadPoints(sessionId: string): NebulaPoint[] {
  if (!storageAvailable()) return []
  try {
    const raw = window.localStorage.getItem(`${HISTORY_PREFIX}${sessionId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { points?: StoredPoint[] }
    if (!Array.isArray(parsed.points)) return []
    const points: NebulaPoint[] = []
    for (const item of parsed.points) {
      const point = storedToPoint(item)
      if (point !== undefined) points.push(point)
    }
    return points.slice(-MAX_POINTS)
  } catch {
    return []
  }
}

function persistPoints(sessionId: string, points: readonly NebulaPoint[]): void {
  if (!storageAvailable()) return
  try {
    const key = `${HISTORY_PREFIX}${sessionId}`
    if (points.length === 0) {
      window.localStorage.removeItem(key)
      return
    }
    const payload = {
      v: 1,
      points: points.slice(-MAX_POINTS).map((point) => ({
        id: point.id,
        text: point.text.slice(0, 4000),
        time: point.time,
        capturedAt: point.capturedAt,
        profile: encodeBytes(encodeProfile(point.profile)),
        signed: encodeBytes(encodeSigned(point.signed)),
        axis: [point.axis[0], point.axis[1], point.axis[2]],
        mapX: point.mapX,
        mapY: point.mapY,
        schemeBase: point.schemeBase,
        magnitude: point.magnitude,
        tokens: point.tokens,
      })),
    }
    window.localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // Storage pressure must never break the panel.
  }
}

export function loadSettings(): NebulaSettings {
  if (!storageAvailable()) return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<NebulaSettings>
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      autoOpen: typeof parsed.autoOpen === 'boolean' ? parsed.autoOpen : DEFAULT_SETTINGS.autoOpen,
      // 5120 is gone; anyone still holding it lands on 8192, which is the tier
      // that reproduces the density they had (5120 drew fewer particles).
      dims: parsed.dims === 16384 || parsed.dims === 32768 ? parsed.dims : 8192,
      palette: [0, 1, 2].includes(Number(parsed.palette)) ? Number(parsed.palette) : 0,
      persist: typeof parsed.persist === 'boolean' ? parsed.persist : DEFAULT_SETTINGS.persist,
      motion: parsed.motion === 'auto' ? 'auto' : 'full',
      speed: parsed.speed === 'low' || parsed.speed === 'high' ? parsed.speed : 'mid',
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: NebulaSettings): void {
  if (!storageAvailable()) return
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Settings are a convenience, never a requirement.
  }
}

export function clearAllHistory(): void {
  if (!storageAvailable()) return
  try {
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key !== null && key.startsWith(HISTORY_PREFIX)) keys.push(key)
    }
    for (const key of keys) window.localStorage.removeItem(key)
  } catch {
    // Nothing to clear is the same as cleared.
  }
}

export function formatClock(ms: number): string {
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return '--:--'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/* ------------------------------------------------------------------- store */

export class SessionStore implements NebulaFace {
  private points: NebulaPoint[]
  private currentId: string | undefined
  private playing = false
  private answer: { text: string; time: number } | undefined
  private sequence: SequenceFrame[] | undefined
  private sequenceStart = 0
  private timer: number | undefined
  private persistTimer: number | undefined
  private listeners = new Set<() => void>()
  private snapshot: PanelSnapshot
  private revision = 0

  constructor(
    readonly sessionId: string,
    private readonly host: StoreHost,
  ) {
    this.points = this.host.settings().persist ? loadPoints(sessionId) : []
    this.currentId = this.points.at(-1)?.id
    this.snapshot = this.build()
  }

  /* ---------------------------------------------------------------- face */

  getSnapshot = (): PanelSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  open = (): void => this.host.requestOpen(this.sessionId)
  hide = (): void => this.host.requestHide()
  play = (): void => this.playSequence()
  stop = (): void => this.stopSequence(true)
  select = (id: string): void => this.selectPoint(id)
  clear = (): void => this.clearPoints()
  setEnabled = (value: boolean): void => this.host.setEnabled(value)
  setAutoOpen = (value: boolean): void => this.host.setAutoOpen(value)
  setDims = (dims: EmbeddingDims): void => this.host.setDims(dims)
  setPalette = (palette: number): void => this.host.setPalette(palette)
  setPersist = (value: boolean): void => this.host.setPersist(value)
  setMotion = (value: MotionMode): void => this.host.setMotion(value)
  setSpeed = (value: SpeedLevel): void => this.host.setSpeed(value)

  /** Record the latest completed answer; only the optional roam uses it. */
  setAnswer(text: string, time: number): void {
    const normalized = text.replace(/\s+/g, ' ').trim()
    if (normalized.length === 0) return
    if (this.answer?.text === normalized && this.answer.time === time) return
    this.answer = { text: normalized.slice(0, 12000), time }
    this.emit()
  }

  /* ------------------------------------------------------------- actions */

  private build(): PanelSnapshot {
    return {
      sessionId: this.sessionId,
      points: this.points,
      currentId: this.currentId,
      settings: this.host.settings(),
      playing: this.playing,
      answer: this.answer,
      revision: this.revision,
    }
  }

  private emit(): void {
    this.revision += 1
    this.snapshot = this.build()
    for (const listener of this.listeners) listener()
    this.schedulePersist()
  }

  hasId(id: string): boolean {
    return this.points.some((point) => point.id === id)
  }

  hasRecentText(text: string, windowMs = DEDUPE_WINDOW_MS): boolean {
    const now = Date.now()
    const normalized = text.replace(/\s+/g, ' ').trim()
    return this.points.some(
      (point) =>
        point.text.replace(/\s+/g, ' ').trim() === normalized &&
        Math.abs(now - point.capturedAt) < windowMs,
    )
  }

  add(point: NebulaPoint): boolean {
    if (this.hasId(point.id)) return false
    if (this.points.length >= MAX_POINTS) this.points = this.points.slice(-(MAX_POINTS - 1))
    this.points = [...this.points, point]
    this.currentId = point.id
    this.answer = undefined
    this.stopSequence(false)
    this.emit()
    return true
  }

  selectPoint(id: string): void {
    if (!this.points.some((point) => point.id === id)) return
    this.stopSequence(false)
    this.currentId = id
    this.answer = undefined
    this.emit()
  }

  clearPoints(): void {
    this.stopSequence(false)
    this.points = []
    this.currentId = undefined
    this.answer = undefined
    this.emit()
    if (this.host.settings().persist) persistPoints(this.sessionId, [])
  }

  current(): NebulaPoint | undefined {
    return this.points.find((point) => point.id === this.currentId) ?? this.points.at(-1)
  }

  /* ------------------------------------------------------------- roaming */

  private playSequence(): void {
    if (this.playing) {
      this.stopSequence(true)
      return
    }
    const current = this.current()
    if (current === undefined) return
    const source = this.answer?.text ?? current.text
    if (source.trim().length === 0) return
    this.sequence = sequenceOf(source, this.host.settings().dims)
    this.sequenceStart = performance.now() + 140
    this.playing = true
    this.emit()
    const total = 140 + this.sequence.length * FRAME_MS + 180
    this.timer = window.setTimeout(() => {
      this.timer = undefined
      this.playing = false
      this.sequence = undefined
      this.emit()
    }, total)
  }

  private stopSequence(notify: boolean): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer)
      this.timer = undefined
    }
    if (!this.playing && this.sequence === undefined) return
    this.playing = false
    this.sequence = undefined
    if (notify) this.emit()
  }

  /** Cancel playback without emitting; the caller owns the next snapshot. */
  cancelPlayback(): void {
    this.stopSequence(false)
  }

  sequenceAt = (now: number): RoamFrame | undefined => {
    const sequence = this.sequence
    if (!this.playing || sequence === undefined || sequence.length === 0) return undefined
    const elapsed = now - this.sequenceStart
    if (elapsed <= 0) {
      const first = sequence[0]!
      return { a: first, b: first, mix: 0, index: 0, label: first.label }
    }
    const position = elapsed / FRAME_MS
    const index = Math.min(sequence.length - 1, Math.floor(position))
    const a = sequence[index]!
    if (index >= sequence.length - 1) {
      return { a, b: a, mix: 0, index, label: a.label }
    }
    const b = sequence[index + 1]!
    const mix = Math.min(1, Math.max(0, position - index))
    return { a, b, mix, index, label: mix < 0.5 ? a.label : b.label }
  }

  /* ------------------------------------------------------------- settings */

  onSettingsChanged(previous: NebulaSettings): void {
    const settings = this.host.settings()
    if (settings.dims !== previous.dims) this.cancelPlayback()
    if (!settings.enabled) this.cancelPlayback()
    if (previous.persist && !settings.persist) persistPoints(this.sessionId, [])
    this.emit()
  }

  /* ------------------------------------------------------------ lifecycle */

  private schedulePersist(): void {
    if (this.persistTimer !== undefined) return
    this.persistTimer = window.setTimeout(() => {
      this.persistTimer = undefined
      if (!this.host.settings().persist) return
      persistPoints(this.sessionId, this.points)
    }, 320)
  }

  dispose(): void {
    if (this.timer !== undefined) window.clearTimeout(this.timer)
    if (this.persistTimer !== undefined) {
      window.clearTimeout(this.persistTimer)
      this.persistTimer = undefined
      if (this.host.settings().persist) persistPoints(this.sessionId, this.points)
    }
    this.listeners.clear()
  }
}
