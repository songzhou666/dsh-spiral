import type { EmbeddingDims, SequenceFrame } from './engine'
import type { MotionMode } from './motion'

/** One committed prompt signal. */
export interface NebulaPoint {
  readonly id: string
  readonly text: string
  /** Display time (host event time when available). */
  readonly time: number
  /** Local capture time, used for near-duplicate suppression. */
  readonly capturedAt: number
  readonly profile: Float32Array
  readonly signed: Float32Array
  readonly axis: readonly [number, number, number]
  readonly mapX: number
  readonly mapY: number
  readonly schemeBase: number
  readonly magnitude: number
  readonly tokens: number
}

export interface NebulaSettings {
  readonly enabled: boolean
  readonly autoOpen: boolean
  readonly dims: EmbeddingDims
  readonly palette: number
  readonly persist: boolean
  /** `auto` follows `prefers-reduced-motion`; `full` always animates. */
  readonly motion: MotionMode
}

export interface PanelSnapshot {
  readonly sessionId: string
  readonly points: readonly NebulaPoint[]
  readonly currentId: string | undefined
  readonly settings: NebulaSettings
  readonly playing: boolean
  /** Latest completed assistant answer; the optional roam source. */
  readonly answer: { readonly text: string; readonly time: number } | undefined
  readonly revision: number
}

/** A live interpolation between two roaming frames. */
export interface RoamFrame {
  readonly a: SequenceFrame
  readonly b: SequenceFrame
  readonly mix: number
  readonly index: number
  readonly label: string
}

/** The store face handed to the panel component. */
export interface NebulaFace {
  getSnapshot(): PanelSnapshot
  subscribe(listener: () => void): () => void
  open(): void
  hide(): void
  setEnabled(value: boolean): void
  setAutoOpen(value: boolean): void
  setDims(dims: EmbeddingDims): void
  setPalette(palette: number): void
  setPersist(value: boolean): void
  setMotion(value: MotionMode): void
  play(): void
  stop(): void
  select(id: string): void
  clear(): void
  sequenceAt(now: number): RoamFrame | undefined
}
