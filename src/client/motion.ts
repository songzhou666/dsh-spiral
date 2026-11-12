/**
 * Motion policy shared by both canvases and the settings sheet.
 *
 * `auto` follows the platform preference; `full` ignores it. The default is
 * `full`, deliberately: this panel is a decorative galaxy that people install to
 * look at, and Windows "animation effects: off" (the default on servers, on many
 * VMs and over RDP) flips `prefers-reduced-motion: reduce` for reasons that have
 * nothing to do with this widget. Waking up to a disc creeping at a fraction of
 * a degree per second reads as "the plugin is broken", which is the one thing a
 * first-run experience must not do. Anyone who actually wants the calmer disc —
 * including on a machine that asks for less motion — picks 跟随系统, and that
 * mode still turns (see below) rather than stopping.
 */
export type MotionMode = 'auto' | 'full'

const QUERY = '(prefers-reduced-motion: reduce)'

const listeners = new Set<() => void>()
let media: MediaQueryList | undefined
let systemReduced = false

const query = (): MediaQueryList | undefined => {
  if (media !== undefined) return media
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
  media = window.matchMedia(QUERY)
  systemReduced = media.matches
  const onChange = (): void => {
    systemReduced = media?.matches ?? false
    for (const listener of listeners) listener()
  }
  // Older Safari only has the deprecated listener pair; both stubs and jsdom
  // may expose neither, hence the guards.
  if (typeof media.addEventListener === 'function') media.addEventListener('change', onChange)
  else if (typeof media.addListener === 'function') media.addListener(onChange)
  return media
}

/** Whether the platform currently asks for reduced motion. */
export function systemPrefersReducedMotion(): boolean {
  query()
  return systemReduced
}

/**
 * Whether the canvases should run their full motion.
 * @param mode - the user's setting; unknown values fall back to `auto`.
 */
export function motionEnabled(mode: MotionMode | undefined): boolean {
  if (mode === 'full') return true
  if (mode === 'auto' || mode === undefined) return !systemPrefersReducedMotion()
  return true
}

/**
 * Watch the platform preference so the settings sheet can explain itself.
 * @param listener - called after the preference flips.
 * @returns the unsubscriber.
 */
export function subscribeSystemMotion(listener: () => void): () => void {
  query()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Rotation speed tiers. `mid` is the historic speed, so an untouched install and
 * every number in `verify-physics.mjs` stay comparable across releases.
 */
export type SpeedLevel = 'low' | 'mid' | 'high'

/** Multipliers applied to the disc's angular velocity. */
export const SPEED_SCALE: Record<SpeedLevel, number> = { low: 0.5, mid: 1, high: 1.9 }

/**
 * Multiplier for the current tier; unknown values fall back to `mid`.
 * @param level - the user's setting.
 */
export function speedScale(level: SpeedLevel | undefined): number {
  return level === 'low' || level === 'high' ? SPEED_SCALE[level] : SPEED_SCALE.mid
}
