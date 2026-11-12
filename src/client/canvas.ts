/** Small 2D drawing helpers shared by the two canvases. */

export const TAU = Math.PI * 2

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Deterministic 32-bit RNG, used for stable star and dust placement. */
export function makeRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `#rrggbb` or `#rgb` to `rgba(...)`. */
export function hexToRgba(hex: string, alpha: number): string {
  const value = hex.trim()
  if (value.startsWith('rgba(') || value.startsWith('rgb(')) return value
  let body = value.startsWith('#') ? value.slice(1) : value
  if (body.length === 3) body = body.split('').map((ch) => ch + ch).join('')
  const int = Number.parseInt(body, 16)
  if (Number.isNaN(int)) return `rgba(140, 190, 255, ${alpha})`
  const r = (int >> 16) & 0xff
  const g = (int >> 8) & 0xff
  const b = int & 0xff
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const SPRITE_SIZE = 64

/**
 * Cached soft radial sprites, one per colour. Additive drawing of a cached
 * bitmap is dramatically cheaper than building a gradient per particle.
 */
export class SpriteCache {
  private readonly cache = new Map<string, HTMLCanvasElement>()

  get(color: string): HTMLCanvasElement {
    const hit = this.cache.get(color)
    if (hit !== undefined) return hit
    const canvas = document.createElement('canvas')
    canvas.width = SPRITE_SIZE
    canvas.height = SPRITE_SIZE
    const ctx = canvas.getContext('2d')
    if (ctx !== null) {
      const c = SPRITE_SIZE / 2
      const gradient = ctx.createRadialGradient(c, c, 0, c, c, c)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)')
      gradient.addColorStop(0.16, hexToRgba(color, 0.92))
      gradient.addColorStop(0.42, hexToRgba(color, 0.34))
      gradient.addColorStop(0.72, hexToRgba(color, 0.07))
      gradient.addColorStop(1, hexToRgba(color, 0))
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)
    }
    this.cache.set(color, canvas)
    return canvas
  }
}

/** Give a canvas a DPR-correct backing store and return its CSS-pixel context. */
export function prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number, dpr: number): CanvasRenderingContext2D | undefined {
  const ctx = canvas.getContext('2d', { alpha: true })
  if (ctx === null) return undefined
  const pixelWidth = Math.max(1, Math.round(width * dpr))
  const pixelHeight = Math.max(1, Math.round(height * dpr))
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

export function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
