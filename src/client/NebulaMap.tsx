import { useEffect, useRef } from 'react'
import { motionEnabled } from './motion'
import { schemeOf } from './engine'
import type { NebulaFace, NebulaPoint, NebulaSettings } from './types'
import { SpriteCache, TAU, clamp, hexToRgba } from './canvas'

export interface MapCanvasProps {
  readonly face: NebulaFace
  readonly points: readonly NebulaPoint[]
  readonly currentId: string | undefined
  readonly settings: NebulaSettings
  readonly playing: boolean
}

const MAP_EXTENT = 1.24

/** The 2D semantic chart: footprint trail, constellation links, current crosshair. */
export function MapCanvas({ face, points, currentId, settings, playing }: MapCanvasProps): React.ReactElement {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ points, currentId, settings, playing })
  stateRef.current = { points, currentId, settings, playing }
  const pointerRef = useRef({ x: -1, y: -1, inside: false })
  const hoverRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (host === null || canvas === null) return
    const sprites = new SpriteCache()
    const stars: { x: number; y: number; size: number; phase: number; tint: number }[] = []
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.4 + Math.random() * 1.4,
        phase: Math.random() * TAU,
        tint: Math.floor(Math.random() * 4),
      })
    }
    let width = 0
    let height = 0
    let dpr = 1
    let raf = 0
    let visible = true
    let disposed = false
    let last = performance.now()
    let sweep = 0
    let shock = 1
    let lastCurrent: string | undefined

    const resize = (): void => {
      const rect = host.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      width = rect.width
      height = rect.height
      dpr = clamp(window.devicePixelRatio || 1, 1, 2)
    }

    const draw = (now: number): void => {
      const ctx = canvas.getContext('2d', { alpha: true })
      if (ctx === null) return
      const pixelWidth = Math.max(1, Math.round(width * dpr))
      const pixelHeight = Math.max(1, Math.round(height * dpr))
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      const state = stateRef.current
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
      last = now
      // The minimap follows the same policy as the nebula: no sweep when the
      // canvas is calm, because a sweeping line is exactly the kind of motion
      // the preference asks to remove.
      sweep += dt * (motionEnabled(state.settings.motion) ? 0.42 : 0)
      if (shock > 0) shock = Math.max(0, shock - dt / 1.2)
      if (state.currentId !== lastCurrent) {
        lastCurrent = state.currentId
        shock = 1
      }

      const scheme = schemeOf(state.points.at(-1)?.schemeBase ?? 0, state.settings.palette)
      const pad = 18
      const plotW = Math.max(10, width - pad * 2)
      const plotH = Math.max(10, height - pad * 2)
      const toX = (value: number): number => pad + ((clamp(value, -MAP_EXTENT, MAP_EXTENT) + MAP_EXTENT) / (MAP_EXTENT * 2)) * plotW
      const toY = (value: number): number => pad + ((MAP_EXTENT - clamp(value, -MAP_EXTENT, MAP_EXTENT)) / (MAP_EXTENT * 2)) * plotH
      const cx = width / 2
      const cy = height / 2

      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, '#04060e')
      bg.addColorStop(0.55, '#070b17')
      bg.addColorStop(1, '#03040a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7)
      wash.addColorStop(0, hexToRgba(scheme.arms[1]!, 0.08))
      wash.addColorStop(0.6, hexToRgba(scheme.arms[2]!, 0.03))
      wash.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = wash
      ctx.fillRect(0, 0, width, height)

      // Faint semantic terrain and a starfield, so a single point still has depth.
      ctx.globalCompositeOperation = 'lighter'
      const terrain: readonly [number, number, number, number][] = [
        [0.24, 0.3, 0.34, 0.07],
        [0.74, 0.24, 0.28, 0.06],
        [0.62, 0.76, 0.4, 0.065],
        [0.18, 0.78, 0.26, 0.05],
        [0.5, 0.52, 0.5, 0.045],
      ]
      for (let index = 0; index < terrain.length; index++) {
        const [tx, ty, tr, ta] = terrain[index]!
        const size = Math.max(width, height) * tr
        ctx.globalAlpha = ta
        ctx.drawImage(sprites.get(scheme.arms[index % 4]!), width * tx - size / 2, height * ty - size / 2, size, size)
      }
      for (const star of stars) {
        ctx.globalAlpha = 0.18 + Math.abs(Math.sin(star.phase + now * 0.0006)) * 0.3
        ctx.fillStyle = star.tint % 3 === 0 ? '#ffe9c9' : '#dceaff'
        ctx.fillRect(star.x * width, star.y * height, star.size, star.size)
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      // Coordinate grid.
      ctx.strokeStyle = 'rgba(128, 170, 255, 0.075)'
      ctx.lineWidth = 0.6
      for (let i = 0; i <= 8; i++) {
        const x = pad + (i / 8) * plotW
        const y = pad + (i / 8) * plotH
        ctx.beginPath()
        ctx.moveTo(x, pad)
        ctx.lineTo(x, pad + plotH)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(pad, y)
        ctx.lineTo(pad + plotW, y)
        ctx.stroke()
      }

      // Range rings and axes.
      for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath()
        ctx.arc(cx, cy, (Math.min(plotW, plotH) / 2) * (ring / 4.4), 0, TAU)
        ctx.setLineDash([2, 6])
        ctx.strokeStyle = `rgba(128, 170, 255, ${0.06 + ring * 0.012})`
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.strokeStyle = 'rgba(128, 170, 255, 0.09)'
      ctx.beginPath()
      ctx.moveTo(cx, pad)
      ctx.lineTo(cx, pad + plotH)
      ctx.moveTo(pad, cy)
      ctx.lineTo(pad + plotW, cy)
      ctx.stroke()

      // Origin reticle.
      ctx.strokeStyle = hexToRgba(scheme.core, 0.16)
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, TAU)
      ctx.moveTo(cx - 7, cy)
      ctx.lineTo(cx - 4, cy)
      ctx.moveTo(cx + 4, cy)
      ctx.lineTo(cx + 7, cy)
      ctx.moveTo(cx, cy - 7)
      ctx.lineTo(cx, cy - 4)
      ctx.moveTo(cx, cy + 4)
      ctx.lineTo(cx, cy + 7)
      ctx.stroke()

      // Axis coordinates.
      ctx.font = '8px ui-monospace, monospace'
      ctx.fillStyle = 'rgba(150, 190, 255, 0.28)'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText('−X', pad, height - 6)
      ctx.textAlign = 'right'
      ctx.fillText('+X', width - pad, height - 6)
      ctx.textAlign = 'center'
      ctx.fillText('−Y', cx, pad + 10)

      // Radar sweep: a rotating needle with a soft wake.
      const sweepRadius = Math.min(plotW, plotH) * 0.5
      for (let trailIndex = 3; trailIndex >= 0; trailIndex--) {
        const theta = sweep - trailIndex * 0.045
        const ray = ctx.createLinearGradient(cx, cy, cx + Math.cos(theta) * sweepRadius, cy + Math.sin(theta) * sweepRadius)
        ray.addColorStop(0, hexToRgba(scheme.accent, trailIndex === 0 ? 0.22 : 0.08))
        ray.addColorStop(0.55, hexToRgba(scheme.accent, trailIndex === 0 ? 0.08 : 0.025))
        ray.addColorStop(1, hexToRgba(scheme.accent, 0))
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(theta) * sweepRadius, cy + Math.sin(theta) * sweepRadius)
        ctx.strokeStyle = ray
        ctx.lineWidth = trailIndex === 0 ? 0.9 : 0.6
        ctx.stroke()
      }

      // Corner brackets.
      ctx.strokeStyle = 'rgba(150, 190, 255, 0.2)'
      ctx.lineWidth = 1
      const bracket = 11
      const corners: readonly [number, number, number, number][] = [
        [pad - 5, pad - 5, 1, 1],
        [width - pad + 5, pad - 5, -1, 1],
        [pad - 5, height - pad + 5, 1, -1],
        [width - pad + 5, height - pad + 5, -1, -1],
      ]
      for (const [x, y, sx, sy] of corners) {
        ctx.beginPath()
        ctx.moveTo(x + sx * bracket, y)
        ctx.lineTo(x, y)
        ctx.lineTo(x, y + sy * bracket)
        ctx.stroke()
      }

      const pointsNow = state.points
      const palette = state.settings.palette
      const trail = pointsNow.slice(-40)
      const ghostPoint = state.playing ? face.sequenceAt(now) : undefined

      // Roaming ghost, drawn under the footprint label.
      if (ghostPoint !== undefined) {
        const gx = toX(ghostPoint.a.mapX + (ghostPoint.b.mapX - ghostPoint.a.mapX) * ghostPoint.mix)
        const gy = toY(ghostPoint.a.mapY + (ghostPoint.b.mapY - ghostPoint.a.mapY) * ghostPoint.mix)
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.9
        const size = 16
        ctx.drawImage(sprites.get(scheme.core), gx - size / 2, gy - size / 2, size, size)
        ctx.globalAlpha = 0.4
        ctx.drawImage(sprites.get(scheme.accent), gx - size * 1.5, gy - size * 1.5, size * 3, size * 3)
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = hexToRgba(scheme.core, 0.7)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(gx, gy - 6)
        ctx.lineTo(gx + 6, gy)
        ctx.lineTo(gx, gy + 6)
        ctx.lineTo(gx - 6, gy)
        ctx.closePath()
        ctx.stroke()
        ctx.fillStyle = hexToRgba(scheme.core, 0.7)
        ctx.font = '8px ui-monospace, monospace'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(`TOK ${ghostPoint.index + 1}`, gx + 10, gy - 6)
      }

      // History trail.
      if (trail.length > 1) {
        ctx.beginPath()
        ctx.moveTo(toX(trail[0]!.mapX), toY(trail[0]!.mapY))
        for (let i = 1; i < trail.length; i++) {
          const prev = trail[i - 1]!
          const next = trail[i]!
          const mx = (toX(prev.mapX) + toX(next.mapX)) / 2
          const my = (toY(prev.mapY) + toY(next.mapY)) / 2
          ctx.quadraticCurveTo(toX(prev.mapX), toY(prev.mapY), mx, my)
        }
        const tail = trail[trail.length - 1]!
        ctx.lineTo(toX(tail.mapX), toY(tail.mapY))
        ctx.strokeStyle = hexToRgba(scheme.accent, 0.24)
        ctx.lineWidth = 0.9
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(toX(trail[0]!.mapX), toY(trail[0]!.mapY))
        for (let i = 1; i < trail.length; i++) {
          const next = trail[i]!
          ctx.lineTo(toX(next.mapX), toY(next.mapY))
        }
        ctx.strokeStyle = hexToRgba(scheme.core, 0.1)
        ctx.lineWidth = 0.4
        ctx.stroke()
      }

      // Constellation links between nearby footprint points.
      const recent = pointsNow.slice(-18)
      for (let i = 0; i < recent.length; i++) {
        for (let j = i + 1; j < recent.length; j++) {
          const a = recent[i]!
          const b = recent[j]!
          const dx = a.mapX - b.mapX
          const dy = a.mapY - b.mapY
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance > 0.72) continue
          ctx.beginPath()
          ctx.moveTo(toX(a.mapX), toY(a.mapY))
          ctx.lineTo(toX(b.mapX), toY(b.mapY))
          ctx.strokeStyle = hexToRgba(scheme.arms[(i + j) % 4]!, 0.05 + (1 - distance / 0.72) * 0.06)
          ctx.lineWidth = 0.4
          ctx.stroke()
        }
      }

      // Footprint halos.
      for (let index = 0; index < pointsNow.length; index++) {
        const point = pointsNow[index]!
        const x = toX(point.mapX)
        const y = toY(point.mapY)
        const age = pointsNow.length <= 1 ? 1 : index / (pointsNow.length - 1)
        const pointScheme = schemeOf(point.schemeBase, palette)
        const current = point.id === state.currentId
        const size = (18 + point.magnitude * 30) * (current ? 1.35 : 1)
        ctx.globalAlpha = (0.08 + age * 0.14) * (current ? 1.4 : 1)
        ctx.globalCompositeOperation = 'lighter'
        ctx.drawImage(sprites.get(pointScheme.accent), x - size / 2, y - size / 2, size, size)
        ctx.globalAlpha = 0.45 + age * 0.4
        ctx.fillStyle = pointScheme.core
        ctx.beginPath()
        ctx.arc(x, y, 1.4 + point.magnitude * 1.6, 0, TAU)
        ctx.fill()
        ctx.globalAlpha = 0.3
        ctx.strokeStyle = pointScheme.arms[1]!
        ctx.lineWidth = 0.7
        ctx.beginPath()
        ctx.arc(x, y, 4 + point.magnitude * 4, 0, TAU)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'

        // Hover target.
        const pointer = pointerRef.current
        if (pointer.inside) {
          const dx = pointer.x - x
          const dy = pointer.y - y
          if (dx * dx + dy * dy < 15 * 15) hoverRef.current = point.id
        }
      }

      // Current crosshair and pulse.
      const current = pointsNow.find((point) => point.id === state.currentId) ?? pointsNow.at(-1)
      if (current !== undefined) {
        const x = toX(current.mapX)
        const y = toY(current.mapY)
        const pulse = 10 + Math.sin(now * 0.0035) * 4
        ctx.strokeStyle = hexToRgba(scheme.core, 0.55)
        ctx.lineWidth = 0.9
        ctx.beginPath()
        ctx.arc(x, y, pulse, 0, TAU)
        ctx.stroke()
        ctx.strokeStyle = hexToRgba(scheme.accent, 0.36)
        ctx.beginPath()
        ctx.moveTo(x - 14, y)
        ctx.lineTo(x - 6, y)
        ctx.moveTo(x + 6, y)
        ctx.lineTo(x + 14, y)
        ctx.moveTo(x, y - 14)
        ctx.lineTo(x, y - 6)
        ctx.moveTo(x, y + 6)
        ctx.lineTo(x, y + 14)
        ctx.stroke()

        if (shock > 0) {
          const k = 1 - shock
          ctx.beginPath()
          ctx.arc(x, y, 8 + k * 42, 0, TAU)
          ctx.strokeStyle = hexToRgba(scheme.core, shock * 0.45)
          ctx.lineWidth = 1.2
          ctx.stroke()
        }

        const label = current.text.replace(/\s+/g, ' ').trim().slice(0, 26)
        ctx.font = '10px system-ui, -apple-system, "Segoe UI", sans-serif'
        const metrics = ctx.measureText(label)
        const boxW = metrics.width + 14
        const boxH = 20
        let boxX = x + 10
        let boxY = y - 30
        if (boxX + boxW > width - 8) boxX = x - boxW - 10
        if (boxY < 8) boxY = y + 14
        ctx.fillStyle = 'rgba(5, 8, 16, 0.82)'
        ctx.strokeStyle = hexToRgba(scheme.accent, 0.28)
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.rect(boxX, boxY, boxW, boxH)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = hexToRgba(scheme.core, 0.86)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, boxX + 7, boxY + boxH / 2 + 0.5)
      }

      // Hover tooltip.
      const hovered = pointsNow.find((point) => point.id === hoverRef.current)
      if (hovered !== undefined) {
        const x = toX(hovered.mapX)
        const y = toY(hovered.mapY)
        const text = hovered.text.replace(/\s+/g, ' ').trim()
        const label = text.length > 44 ? `${text.slice(0, 44)}…` : text
        ctx.font = '10px system-ui, -apple-system, "Segoe UI", sans-serif'
        const metrics = ctx.measureText(label)
        const boxW = metrics.width + 16
        const boxH = 34
        let boxX = x + 14
        let boxY = y + 18
        if (boxX + boxW > width - 8) boxX = x - boxW - 14
        if (boxY + boxH > height - 8) boxY = y - boxH - 18
        ctx.fillStyle = 'rgba(4, 7, 15, 0.9)'
        ctx.strokeStyle = hexToRgba(scheme.core, 0.3)
        ctx.lineWidth = 0.8
        ctx.beginPath()
        ctx.rect(boxX, boxY, boxW, boxH)
        ctx.fill()
        ctx.stroke()
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillStyle = 'rgba(226, 240, 255, 0.9)'
        ctx.fillText(label, boxX + 8, boxY + 6)
        ctx.fillStyle = 'rgba(150, 190, 255, 0.5)'
        ctx.font = '9px ui-monospace, monospace'
        const when = new Date(hovered.time)
        const clock = Number.isNaN(when.getTime())
          ? '--:--'
          : `${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`
        ctx.fillText(`${clock}  TOK ${hovered.tokens}  Σ ${hovered.magnitude.toFixed(2)}`, boxX + 8, boxY + 20)
      }

      // HUD.
      const hudMask = ctx.createLinearGradient(0, 0, 0, 46)
      hudMask.addColorStop(0, 'rgba(3, 5, 12, 0.78)')
      hudMask.addColorStop(0.7, 'rgba(3, 5, 12, 0.4)')
      hudMask.addColorStop(1, 'rgba(3, 5, 12, 0)')
      ctx.fillStyle = hudMask
      ctx.fillRect(0, 0, width, 46)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'
      ctx.shadowBlur = 5
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(172, 204, 255, 0.46)'
      ctx.fillText('SEMANTIC MAP', 12, 11)
      ctx.fillStyle = 'rgba(172, 204, 255, 0.28)'
      ctx.fillText(`PTS ${pointsNow.length}`, 12, 24)
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(172, 204, 255, 0.3)'
      const currentPoint = current
      // The right-hand HUD shares the title line; shrink it rather than
      // colliding with the left label in the small floating card.
      const coord = currentPoint === undefined
        ? 'X -- / Y --'
        : `X ${currentPoint.mapX >= 0 ? '+' : ''}${currentPoint.mapX.toFixed(2)} / Y ${currentPoint.mapY >= 0 ? '+' : ''}${currentPoint.mapY.toFixed(2)}`
      if (ctx.measureText(coord).width > width - 96) ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      ctx.fillText(coord, width - 12, 11)
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      ctx.fillText(state.playing ? 'ROAMING' : 'IDLE', width - 12, 24)

      if (pointsNow.length === 0) {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(160, 196, 255, 0.4)'
        ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif'
        ctx.fillText('等待语义注入', cx, cy + 4)
        ctx.fillStyle = 'rgba(140, 176, 240, 0.24)'
        ctx.font = '9px ui-monospace, monospace'
        ctx.fillText('SUBMIT A PROMPT TO PLOT', cx, cy + 22)
      }
      ctx.shadowBlur = 0
    }

    const frame = (now: number): void => {
      raf = 0
      if (disposed || !visible || document.hidden) return
      hoverRef.current = undefined
      draw(now)
      raf = requestAnimationFrame(frame)
    }

    const start = (): void => {
      if (disposed || raf !== 0 || !visible || document.hidden) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const stop = (): void => {
      if (raf !== 0) cancelAnimationFrame(raf)
      raf = 0
    }

    const observer = new ResizeObserver(() => {
      resize()
      start()
    })
    observer.observe(host)

    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting)
      if (visible) start()
      else stop()
    }, { threshold: 0.01 })
    intersection.observe(host)

    const onVisibility = (): void => {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)

    resize()
    start()

    return () => {
      disposed = true
      stop()
      observer.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [face])

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect()
    pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top, inside: true }
    event.currentTarget.style.cursor = hoverRef.current === undefined ? 'default' : 'pointer'
  }

  const onPointerLeave = (): void => {
    pointerRef.current = { x: -1, y: -1, inside: false }
    hoverRef.current = undefined
  }

  const onClick = (): void => {
    const id = hoverRef.current
    if (id !== undefined) face.select(id)
  }

  return (
    <div className="dnp-canvas-host" ref={hostRef}>
      <canvas
        className="dnp-canvas"
        ref={canvasRef}
        aria-hidden="true"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={onClick}
      />
    </div>
  )
}
