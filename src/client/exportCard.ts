/**
 * Offline "star chart card" export.
 *
 * The live nebula canvas is asked (through a DOM event) for one repaint at a
 * higher DPR, copied into an offscreen canvas, then laid out on a 1200 x 900
 * collector card with the prompt, its call sign and the local analysis readout.
 * Everything happens in the browser: no network, no model, no extra dependency.
 */
import { NEBULA_CAPTURE_EVENT, TAU, hexToRgba, roundedRect } from './canvas'
import type { NebulaScheme } from './engine'

export interface StarCardData {
  readonly text: string
  readonly time: number
  readonly tokens: number
  readonly magnitude: number
  readonly mapX: number
  readonly mapY: number
  readonly callSign: string
  readonly paletteName: string
  readonly dims: number
  readonly cluster: number
  readonly scheme: NebulaScheme
}

interface CaptureDetail {
  readonly scale: number
  frame: HTMLCanvasElement | null
}

const CARD_W = 1200
const CARD_H = 900
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
const SANS = '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function clock(ms: number): string {
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return '--:--'
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function stamp(ms: number): string {
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return '00000000-0000'
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(2)}`
}

/** Ask the live canvas for one high-DPR frame; fall back to its current pixels. */
export function captureNebulaFrame(host: Element, scale = 2.5): HTMLCanvasElement | null {
  const detail: CaptureDetail = { scale, frame: null }
  host.dispatchEvent(new CustomEvent(NEBULA_CAPTURE_EVENT, { detail }))
  if (detail.frame !== null) return detail.frame
  return host.querySelector('canvas')
}

/** Greedy line breaking; CJK breaks per character, Latin mostly per space. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const compact = text.replace(/\s+/g, ' ').trim() || '—'
  const lines: string[] = []
  let line = ''
  for (const char of compact) {
    const candidate = line + char
    if (ctx.measureText(candidate).width > maxWidth && line.length > 0) {
      lines.push(line.trimEnd())
      if (lines.length === maxLines) return lines
      line = char === ' ' ? '' : char
    } else {
      line = candidate
    }
  }
  if (lines.length < maxLines && line.length > 0) lines.push(line.trimEnd())
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1]!
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) last = last.slice(0, -1)
    lines[maxLines - 1] = `${last}…`
  }
  return lines
}

/** Draw the collector card and return its canvas (testable without a download). */
export function renderStarCard(frame: HTMLCanvasElement, data: StarCardData): HTMLCanvasElement {
  const card = document.createElement('canvas')
  card.width = CARD_W
  card.height = CARD_H
  const ctx = card.getContext('2d')
  if (ctx === null) return card
  const accent = data.scheme.accent

  ctx.fillStyle = '#04060f'
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  const wash = ctx.createRadialGradient(CARD_W * 0.5, CARD_H * 0.38, 0, CARD_W * 0.5, CARD_H * 0.38, CARD_W * 0.8)
  wash.addColorStop(0, hexToRgba(accent, 0.06))
  wash.addColorStop(1, 'rgba(2, 3, 8, 0)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(150, 180, 235, 0.14)'
  roundedRect(ctx, 18, 18, CARD_W - 36, CARD_H - 36, 14)
  ctx.stroke()
  const topLine = ctx.createLinearGradient(44, 0, CARD_W - 44, 0)
  topLine.addColorStop(0, hexToRgba(accent, 0.7))
  topLine.addColorStop(1, hexToRgba(accent, 0))
  ctx.strokeStyle = topLine
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(44, 19)
  ctx.lineTo(CARD_W - 44, 19)
  ctx.stroke()

  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#eaf2ff'
  ctx.font = `600 25px ${SANS}`
  ctx.fillText('SEMANTIC NEBULA', 44, 42)
  ctx.fillStyle = 'rgba(178, 205, 245, 0.55)'
  ctx.font = `13px ${SANS}`
  ctx.fillText('语义星云 · 本地确定性星图', 45, 78)
  ctx.textAlign = 'right'
  ctx.fillStyle = accent
  ctx.font = `600 30px ${MONO}`
  ctx.fillText(data.callSign, CARD_W - 44, 40)
  ctx.fillStyle = 'rgba(178, 205, 245, 0.45)'
  ctx.font = `10px ${MONO}`
  ctx.fillText('CONSTELLATION ID', CARD_W - 44, 80)
  ctx.textAlign = 'left'
  ctx.strokeStyle = 'rgba(150, 180, 235, 0.16)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(44, 112)
  ctx.lineTo(CARD_W - 44, 112)
  ctx.stroke()

  // The field is framed rather than stretched: a contain fit keeps the HUD
  // typography inside the picture, and the dark surround reads as a mount.
  const fx = 44
  const fy = 132
  const fw = CARD_W - 88
  const fh = 612
  ctx.fillStyle = '#050813'
  ctx.fillRect(fx, fy, fw, fh)
  const scale = Math.min(fw / Math.max(1, frame.width), fh / Math.max(1, frame.height))
  const iw = frame.width * scale
  const ih = frame.height * scale
  ctx.drawImage(frame, fx + (fw - iw) / 2, fy + (fh - ih) / 2, iw, ih)
  ctx.strokeStyle = hexToRgba(accent, 0.26)
  ctx.lineWidth = 1
  ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1)
  // Four short corner ticks, the way a finder frame is marked on a plate.
  ctx.strokeStyle = hexToRgba(accent, 0.55)
  ctx.lineWidth = 1.5
  for (const [x, y, dx, dy] of [
    [fx, fy, 1, 1], [fx + fw, fy, -1, 1],
    [fx, fy + fh, 1, -1], [fx + fw, fy + fh, -1, -1],
  ] as const) {
    ctx.beginPath()
    ctx.moveTo(x + dx * 12, y)
    ctx.lineTo(x, y)
    ctx.lineTo(x, y + dy * 12)
    ctx.stroke()
  }
  const tag = `FIELD 01 / NEBULA · ${data.cluster} COMPANIONS`
  ctx.font = `10px ${MONO}`
  const tagW = ctx.measureText(tag).width + 20
  ctx.fillStyle = 'rgba(5, 8, 19, 0.78)'
  ctx.fillRect(fx + 14, fy + 14, tagW, 26)
  ctx.fillStyle = 'rgba(190, 215, 255, 0.82)'
  ctx.fillText(tag, fx + 24, fy + 22)

  ctx.font = `10px ${MONO}`
  ctx.fillStyle = 'rgba(178, 205, 245, 0.5)'
  ctx.fillText('PROMPT', 44, 762)
  ctx.font = `17px ${SANS}`
  ctx.fillStyle = '#dbe8ff'
  for (const [index, line] of wrapLines(ctx, data.text, 700, 3).entries()) {
    ctx.fillText(line, 44, 784 + index * 24)
  }

  const rows: readonly (readonly [string, string])[] = [
    ['TOK', String(data.tokens)],
    ['ENERGY', data.magnitude.toFixed(3)],
    ['MAP', `${signed(data.mapX)} / ${signed(data.mapY)}`],
    ['VEC', String(data.dims)],
    ['PALETTE', data.paletteName],
    ['TIME', clock(data.time)],
  ]
  ctx.font = `11px ${MONO}`
  for (const [index, [key, value]] of rows.entries()) {
    const x = 800 + (index % 2) * 190
    const y = 762 + Math.floor(index / 2) * 26
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(178, 205, 245, 0.42)'
    ctx.fillText(key, x, y)
    ctx.fillStyle = '#dbe8ff'
    ctx.fillText(value, x + 72, y)
  }

  ctx.strokeStyle = 'rgba(150, 180, 235, 0.16)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(44, 848)
  ctx.lineTo(CARD_W - 44, 848)
  ctx.stroke()
  ctx.font = `10px ${MONO}`
  ctx.fillStyle = 'rgba(178, 205, 245, 0.45)'
  ctx.textAlign = 'left'
  ctx.fillText('Generated locally · deterministic hash · no model, no network', 44, 862)
  ctx.textAlign = 'right'
  ctx.fillText('dsh-spiral / SemanticNebula', CARD_W - 88, 862)

  // A small colour seal ties the card to the palette it was captured under.
  ctx.beginPath()
  ctx.arc(CARD_W - 58, CARD_H - 58, 15, 0, TAU)
  ctx.fillStyle = hexToRgba(accent, 0.18)
  ctx.fill()
  ctx.strokeStyle = hexToRgba(accent, 0.65)
  ctx.lineWidth = 1
  ctx.stroke()

  return card
}

/** Capture, lay out and (optionally) download the card as a PNG. */
export async function exportStarCard(
  host: Element | null,
  data: StarCardData,
  download = true,
): Promise<HTMLCanvasElement | undefined> {
  if (host === null) return undefined
  const frame = captureNebulaFrame(host)
  if (frame === null) return undefined
  const card = renderStarCard(frame, data)
  if (!download) return card
  const blob = await new Promise<Blob | null>((resolve) => card.toBlob(resolve, 'image/png'))
  if (blob === null) return card
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `semantic-nebula_${data.callSign}_${stamp(data.time)}.png`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
  return card
}
