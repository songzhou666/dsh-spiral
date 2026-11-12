/**
 * Browser half: a free-floating, milky-glass observation window.
 *
 * The host half is a no-op; everything here is local. The DSH composer is never
 * wrapped: capture rides the session's pending submission and durable events.
 */
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { NebulaController } from './controller'
import { FloatingNebula } from './Floating'
import { installStyles } from './styles'

/** Services this plugin reads; both are part of the standard web profile. */
export const inject = ['sidebarRight', 'sessions']

/**
 * Mount the floating overlay into the document body.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  const controller = new NebulaController(ctx as never)

  ctx.effect(() => () => controller.dispose(), 'dsh-spiral: controller')
  ctx.effect(() => installStyles(), 'dsh-spiral: styles')
  ctx.effect(() => {
    if (typeof document === 'undefined' || document.body === null) return () => {}
    const host = document.createElement('div')
    host.className = 'dnf-root'
    host.dataset.dshNebula = 'overlay'
    document.body.appendChild(host)
    const root = createRoot(host)
    root.render(createElement(FloatingNebula, { controller }))
    return () => {
      root.unmount()
      host.remove()
    }
  }, 'dsh-spiral: floating overlay')
}
