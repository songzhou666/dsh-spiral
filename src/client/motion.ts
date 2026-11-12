/**
 * Motion policy shared by both canvases and the settings sheet.
 *
 * `auto` follows the platform preference. `full` opts out of it, and that case
 * is why this module exists at all: Windows "animation effects: off" (the
 * default on servers, on many VMs and over RDP) flips
 * `prefers-reduced-motion: reduce`, and a decorative galaxy that then creeps at
 * a fraction of a degree per second reads as "the plugin is broken", not as
 * "the system asked for less motion". A user who turned the system setting off
 * for reasons unrelated to this panel can opt back in, and nobody's
 * accessibility preference is ignored by default.
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
