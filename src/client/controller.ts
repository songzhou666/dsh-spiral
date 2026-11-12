/**
 * Client controller: session-scoped capture, settings, and the sidebar tab.
 *
 * Capture is intentionally one-shot per submission. There is no onInput hook:
 * the Host-accepted pending echo is the earliest reliable signal, and the
 * durable `user/message` event is the fallback that also rebuilds history.
 */
import { analyze, hashString } from './engine'
import type { EmbeddingDims } from './engine'
import type { MotionMode } from './motion'
import {
  SessionStore,
  loadSettings,
  saveSettings,
  clearAllHistory,
  type StoreHost,
} from './store'
import type { NebulaSettings } from './types'
import type { NebulaFace } from './types'

type ClientContext = any // DSH client context, narrowed by the services used below.

interface Attached {
  readonly sessionId: string
  readonly dispose: () => void
}

interface UserEntry {
  readonly seq: number
  readonly time: number
  readonly id: string
  readonly text: string
}

function normalizeText(text: string): string {
  return text.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim()
}


function textOfContent(content: unknown): string {
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const block of content) {
    if (block !== null && typeof block === 'object' && (block as { type?: unknown }).type === 'text') {
      const text = (block as { text?: unknown }).text
      if (typeof text === 'string') parts.push(text)
    }
  }
  return parts.join('\n')
}

export class NebulaController implements StoreHost {
  private settingsValue: NebulaSettings
  private readonly stores = new Map<string, SessionStore>()
  private attached: Attached | undefined
  private readonly lastSeq = new Map<string, number>()
  private readonly lastAnswerSeq = new Map<string, number>()
  private readonly pendingTexts: { text: string; at: number }[] = []
  private mountDispose: (() => void) | undefined
  private retryTimer: number | undefined
  private attachAttempts = 0
  private lastMounted: string | undefined
  private visible = false
  private readonly visibleListeners = new Set<() => void>()
  private readonly activeListeners = new Set<() => void>()

  constructor(private readonly ctx: ClientContext) {
    this.settingsValue = loadSettings()
    this.mountDispose = this.ctx.sidebarRight.mounted.subscribe(() => this.syncMounted())
    this.syncMounted()
  }

  /* --------------------------------------------------------------- host API */

  settings(): NebulaSettings {
    return this.settingsValue
  }

  activeSession = (): string | undefined => this.ctx.sidebarRight.mounted.getSnapshot()

  subscribeActive = (listener: () => void): (() => void) => {
    this.activeListeners.add(listener)
    return () => {
      this.activeListeners.delete(listener)
    }
  }

  isVisible = (): boolean => this.visible

  subscribeVisible = (listener: () => void): (() => void) => {
    this.visibleListeners.add(listener)
    return () => {
      this.visibleListeners.delete(listener)
    }
  }

  setVisible(value: boolean): void {
    if (this.visible === value) return
    this.visible = value
    for (const listener of this.visibleListeners) listener()
  }

  requestOpen(sessionId: string): void {
    // Only the mounted session's store is ever asked to open, so this is a
    // deliberate signal rather than a background session stealing focus.
    void sessionId
    this.setVisible(true)
  }

  requestHide(): void {
    this.setVisible(false)
  }

  setEnabled = (value: boolean): void => this.patchSettings({ enabled: value })
  setAutoOpen = (value: boolean): void => this.patchSettings({ autoOpen: value })
  setDims = (dims: EmbeddingDims): void => this.patchSettings({ dims })
  setPalette = (palette: number): void => this.patchSettings({ palette })
  setPersist = (value: boolean): void => this.patchSettings({ persist: value })
  setMotion = (motion: MotionMode): void => this.patchSettings({ motion })

  /* ------------------------------------------------------------------ faces */

  faceFor(sessionId: string): NebulaFace {
    return this.storeFor(sessionId)
  }

  private storeFor(sessionId: string): SessionStore {
    let store = this.stores.get(sessionId)
    if (store === undefined) {
      store = new SessionStore(sessionId, this)
      this.stores.set(sessionId, store)
    }
    return store
  }

  /* -------------------------------------------------------------- settings */

  private patchSettings(patch: Partial<NebulaSettings>): void {
    const previous = this.settingsValue
    const next: NebulaSettings = { ...previous, ...patch }
    if (
      next.enabled === previous.enabled &&
      next.autoOpen === previous.autoOpen &&
      next.dims === previous.dims &&
      next.palette === previous.palette &&
      next.persist === previous.persist &&
      next.motion === previous.motion
    ) {
      return
    }
    this.settingsValue = next
    saveSettings(next)
    for (const store of this.stores.values()) store.onSettingsChanged(previous)
    if (previous.persist && !next.persist) clearAllHistory()
    if (!next.enabled && previous.enabled) {
      this.setVisible(false)
      this.detach()
    } else if (next.enabled && !previous.enabled) {
      this.syncMounted(true)
    }
  }

  /* ------------------------------------------------------------- attachment */

  private syncMounted(force = false): void {
    const sessionId = this.ctx.sidebarRight.mounted.getSnapshot() as string | undefined
    if (this.lastMounted !== sessionId) {
      // The overlay follows the active session; the window itself stays where
      // the user left it instead of collapsing on every session switch.
      this.lastMounted = sessionId
      for (const listener of this.activeListeners) listener()
    }
    if (!force && this.attached?.sessionId === sessionId) return
    this.detach()
    this.attachAttempts = 0
    if (sessionId === undefined || !this.settingsValue.enabled) return
    const binding = this.ctx.sessions.binding(sessionId)
    if (binding === undefined) {
      this.scheduleAttach()
      return
    }
    const onSnapshot = (): void => this.onSessionSnapshot(sessionId, binding.session.getSnapshot())
    const onWindow = (): void => this.onWindow(sessionId, binding.eventSource.getSnapshot())
    const disposeSnapshot = binding.session.subscribe(onSnapshot)
    const disposeWindow = binding.eventSource.subscribe(onWindow)
    this.attached = {
      sessionId,
      dispose: () => {
        disposeSnapshot()
        disposeWindow()
      },
    }
    this.attachAttempts = 0
    this.onWindow(sessionId, binding.eventSource.getSnapshot())
    this.onSessionSnapshot(sessionId, binding.session.getSnapshot())
  }

  private scheduleAttach(): void {
    if (this.retryTimer !== undefined || this.attachAttempts > 20) return
    this.attachAttempts += 1
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = undefined
      this.syncMounted(true)
    }, 140)
  }

  private detach(): void {
    if (this.retryTimer !== undefined) {
      window.clearTimeout(this.retryTimer)
      this.retryTimer = undefined
    }
    this.attached?.dispose()
    this.attached = undefined
  }

  /* ---------------------------------------------------------------- capture */

  private onSessionSnapshot(sessionId: string, snapshot: any): void {
    const pending = snapshot?.pendingSubmissions
    if (!Array.isArray(pending)) return
    for (const submission of pending) {
      if (typeof submission?.text !== 'string') continue
      const id = `pending:${String(submission.requestId ?? '')}`
      this.capture(sessionId, submission.text, {
        id,
        time: Number(submission.time) || Date.now(),
        live: true,
      })
    }
  }

  private onWindow(sessionId: string, window: any): void {
    const entries = window?.entries
    if (!Array.isArray(entries)) return
    const users: UserEntry[] = []
    let answer: UserEntry | undefined
    for (const entry of entries) {
      if (entry?.type !== 'event') continue
      const event = entry.event
      if (event?.type === 'assistant/message') {
        const message = event.data?.message
        if (message?.role !== 'assistant') continue
        const text = textOfContent(message.content)
        if (text.trim().length === 0) continue
        const candidate = {
          seq: Number(event.seq) || 0,
          time: Number(event.time) || Date.now(),
          id: typeof message.id === 'string' ? message.id : `answer:${String(event.seq)}`,
          text,
        }
        if (answer === undefined || candidate.seq > answer.seq) answer = candidate
        continue
      }
      if (event?.type !== 'user/message') continue
      const data = event.data
      if (data?.source?.kind !== 'user') continue
      const text = textOfContent(data.content)
      if (text.trim().length === 0) continue
      users.push({
        seq: Number(event.seq) || 0,
        time: Number(event.time) || Date.now(),
        id: typeof data.id === 'string' ? data.id : `seq:${String(event.seq)}`,
        text,
      })
    }

    if (answer !== undefined && this.settingsValue.enabled) {
      const previousAnswer = this.lastAnswerSeq.get(sessionId)
      if (previousAnswer === undefined || answer.seq > previousAnswer) {
        this.lastAnswerSeq.set(sessionId, answer.seq)
        this.storeFor(sessionId).setAnswer(answer.text, answer.time)
      }
    }

    if (users.length === 0) return
    users.sort((a, b) => a.seq - b.seq)
    const previous = this.lastSeq.get(sessionId)
    const fresh = previous === undefined ? users.slice(-24) : users.filter((entry) => entry.seq > previous)
    for (const entry of fresh) {
      this.capture(sessionId, entry.text, { id: entry.id, time: entry.time, live: false })
    }
    this.lastSeq.set(sessionId, Math.max(previous ?? -1, users[users.length - 1]!.seq))
  }

  private capture(
    sessionId: string,
    rawText: string,
    options: { id: string; time: number; live: boolean },
  ): void {
    if (!this.settingsValue.enabled) return
    const text = normalizeText(rawText)
    if (text.length === 0) return
    const store = this.storeFor(sessionId)
    if (store.hasId(options.id)) return
    if (!options.live && this.consumePending(text)) return
    if (options.live && store.hasRecentText(text, 1200)) return

    const analysis = analyze(text, this.settingsValue.dims)
    const point = {
      id: options.id,
      text: text.slice(0, 4000),
      time: options.time,
      capturedAt: Date.now(),
      ...analysis,
    }
    const added = store.add(point)
    if (!added) return

    if (options.live) {
      this.pendingTexts.push({ text, at: Date.now() })
      if (this.pendingTexts.length > 12) this.pendingTexts.splice(0, this.pendingTexts.length - 12)
      if (this.settingsValue.autoOpen) this.requestOpen(sessionId)
    }
  }

  private consumePending(text: string): boolean {
    const now = Date.now()
    const index = this.pendingTexts.findIndex((entry) => entry.text === text && now - entry.at < 300_000)
    if (index < 0) return false
    this.pendingTexts.splice(index, 1)
    return true
  }

  /* ------------------------------------------------------------ lifecycle */

  dispose(): void {
    this.detach()
    this.mountDispose?.()
    this.mountDispose = undefined
    for (const store of this.stores.values()) store.dispose()
    this.stores.clear()
  }
}

export { hashString }
