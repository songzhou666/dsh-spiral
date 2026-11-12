/**
 * Host half of dsh-spiral.
 *
 * The plugin is purely a browser-side decoration. The Host entry exists only so
 * the bundle can be listed and its `dsh.client` metadata can be discovered by
 * the module loader.
 */
export const name = 'dsh-spiral'

export function apply(): void {
  // Intentionally empty: all behavior lives in the client half.
}
