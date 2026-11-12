import { useEffect, useRef } from 'react'
import { motionEnabled, speedScale } from './motion'
import { PALETTE_NAMES, schemeOf } from './engine'
import type { NebulaFace, NebulaPoint, NebulaSettings } from './types'
import { SpriteCache, TAU, clamp, hexToRgba, makeRng } from './canvas'

export interface NebulaCanvasProps {
  readonly face: NebulaFace
  readonly point: NebulaPoint | undefined
  readonly settings: NebulaSettings
  readonly playing: boolean
}

interface ArmParticle {
  readonly arm: number
  readonly t: number
  readonly jitter: number
  readonly radial: number
  readonly band: number
  readonly size: number
  readonly hot: boolean
  readonly wobble: number
  readonly tint: number
}

interface Cloud {
  readonly arm: number
  readonly t: number
  readonly band: number
  readonly size: number
  readonly alpha: number
  readonly tint: number
}

interface Star {
  readonly x: number
  readonly y: number
  readonly size: number
  readonly phase: number
  readonly speed: number
  readonly tint: number
}

interface Mote {
  readonly r: number
  readonly theta: number
  readonly size: number
  readonly phase: number
  readonly tint: number
}

const STAR_TINTS = ['#dfeaff', '#bcd7ff', '#ffe9c9', '#ffffff'] as const
const PERSPECTIVE = 0.64

/**
 * Sign of the outward arm winding, in radians per disc radius.
 *
 * The pattern turns with +theta, and on a y-down canvas +theta is clockwise.
 * A trailing arm therefore has to reach *backwards* as it grows: at a larger
 * radius it sits at a smaller theta than at a smaller one, i.e. behind the
 * spin, the way a wake sits behind a hull. So the slope is negative — with a
 * positive slope the outer tip would arrive at any given azimuth before the
 * inner part and the arms would lead the rotation, which no real disc does
 * (the classic winding argument: differential rotation shears a radial spoke
 * into exactly this trailing shape, never the opposite one).
 */
const WIND = -4

/**
 * Pitch wobble driven by the brightness profile, in radians.
 *
 * It has to follow the winding sign: the profile value is coherent across the
 * disc, so a fixed positive offset would fight the (now negative) winding at
 * some radii and fold the arm back on itself, which showed up as cusps and
 * near-straight facets along the bright spine. Signed with `WIND`, the wobble
 * only varies the pitch and the arm stays monotonic.
 */
const WIND_WOBBLE = WIND * 0.0875

/**
 * The main radial nebula: profile-driven spiral arms, additive light, HUD rings.
 *
 * Rotation follows the two invariants of a real spiral disc. The arms reach
 * backwards against the turn (`WIND` is negative), so they always trail the
 * spin; and the material inside the disc shears ahead of the rigid density
 * wave, so the core turns fastest. Every layer adds a positive multiple of
 * `angle`, which is why no part of the nebula can ever read as counter-rotating.
 */
export function NebulaCanvas({ face, point, settings, playing }: NebulaCanvasProps): React.ReactElement {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ point, settings, playing })
  stateRef.current = { point, settings, playing }

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (host === null || canvas === null) return
    const sprites = new SpriteCache()
    const rng = makeRng(0x2f8a1c3d)

    const stars: Star[] = []
    for (let i = 0; i < 140; i++) {
      stars.push({
        x: rng(),
        y: rng(),
        size: 0.45 + Math.pow(rng(), 2.2) * 1.9,
        phase: rng() * TAU,
        speed: 0.12 + rng() * 0.55,
        tint: Math.floor(rng() * STAR_TINTS.length),
      })
    }

    const arms: ArmParticle[] = []
    for (let arm = 0; arm < 4; arm++) {
      for (let i = 0; i < 220; i++) {
        const t = 0.04 + Math.pow(rng(), 0.64) * 0.96
        const tint = clamp(Math.floor(t * 3.15 + (rng() - 0.5) * 0.9), 0, 3)
        arms.push({
          arm,
          t,
          jitter: (rng() - 0.5) * 0.26,
          radial: (rng() - 0.5) * 0.075,
          band: clamp(Math.floor(t * 255 + (rng() - 0.5) * 14), 0, 255),
          size: 0.35 + rng() * 1.2,
          hot: rng() > 0.975,
          wobble: rng() * TAU,
          tint,
        })
      }
    }

    const clouds: Cloud[] = []
    for (let i = 0; i < 40; i++) {
      const t = 0.08 + rng() * 0.9
      const tint = clamp(Math.floor(t * 3.15 + (rng() - 0.5) * 0.7), 0, 3)
      clouds.push({
        arm: Math.floor(rng() * 4),
        t,
        band: Math.floor(t * 255),
        size: 0.1 + rng() * 0.3,
        alpha: 0.022 + rng() * 0.052,
        tint,
      })
    }

    const motes: Mote[] = []
    for (let i = 0; i < 40; i++) {
      motes.push({
        r: Math.pow(rng(), 0.55) * 1.14,
        theta: rng() * TAU,
        size: 1.4 + rng() * 3.8,
        phase: rng() * TAU,
        tint: Math.floor(rng() * 4),
      })
    }

    // One 128² grain tile: cheap texture so the gradients never read as flat
    // vector art. Composited once per frame with `overlay`.
    const grainTile = document.createElement('canvas')
    grainTile.width = 128
    grainTile.height = 128
    const grainCtx = grainTile.getContext('2d')
    if (grainCtx !== null) {
      const noise = grainCtx.createImageData(128, 128)
      for (let i = 0; i < noise.data.length; i += 4) {
        const value = 128 + Math.round((rng() * 2 - 1) * 52)
        noise.data[i] = value
        noise.data[i + 1] = value
        noise.data[i + 2] = value
        noise.data[i + 3] = 255
      }
      grainCtx.putImageData(noise, 0, 0)
    }
    let grainPattern: CanvasPattern | null = null

    let width = 0
    let height = 0
    let dpr = 1
    let raf = 0
    let visible = true
    let disposed = false
    let last = performance.now()
    let lastPid: string | undefined
    let angle = 0
    let energy = 0.55
    let enter = 0
    let shock = 0
    let hoverGlow = 0
    let parallaxX = 0
    let parallaxY = 0
    let parallaxTargetX = 0
    let parallaxTargetY = 0
    // Ambient touches: a pointer glint on the stars, a rare meteor, an impulse
    // ring on click, and the grain tile. Each costs at most one extra draw.
    let pointerX = -1e4
    let pointerY = -1e4
    let pointerIn = false
    let ripple = 0
    let rippleX = 0
    let rippleY = 0
    let meteorWait = 6.5 + rng() * 4
    let meteorLife = 0
    let meteorX = 0
    let meteorY = 0
    let meteorVX = 0
    let meteorVY = 0
    let meteorTail = 90
    const profile = new Float32Array(256)
    // Read every frame rather than once at mount: the settings sheet can switch
    // the policy live, and `full` overrides a system that asks for less motion.
    const calm = (): boolean => !motionEnabled(stateRef.current.settings.motion)

    const resize = (): void => {
      const rect = host.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      width = rect.width
      height = rect.height
      dpr = clamp(window.devicePixelRatio || 1, 1, 2)
    }

    // Pointer parallax: a normalized −1..1 vector with the cursor as target.
    const onPointerMove = (event: PointerEvent): void => {
      const rect = host.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      parallaxTargetX = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1)
      parallaxTargetY = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1)
      pointerX = event.clientX - rect.left
      pointerY = event.clientY - rect.top
      pointerIn = true
    }

    const onPointerLeave = (): void => {
      parallaxTargetX = 0
      parallaxTargetY = 0
      pointerIn = false
    }

    // A tap sends one soft impulse outward from the cursor: no state is kept,
    // and with reduced motion the ring is skipped entirely.
    const onPointerDown = (event: PointerEvent): void => {
      const rect = host.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      rippleX = event.clientX - rect.left
      rippleY = event.clientY - rect.top
      ripple = 1
    }

    const draw = (now: number): void => {
      const state = stateRef.current
      const density = state.settings.dims === 8192 ? 1 : 0.62
      const wantedDpr = clamp(window.devicePixelRatio || 1, 1, 1.75)
      if (Math.abs(wantedDpr - dpr) > 0.01) dpr = wantedDpr
      const ctx = canvas.getContext('2d', { alpha: false })
      if (ctx === null) return
      const pixelWidth = Math.max(1, Math.round(width * dpr))
      const pixelHeight = Math.max(1, Math.round(height * dpr))
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
      last = now
      const pid = state.point?.id
      if (pid !== lastPid) {
        lastPid = pid
        if (pid !== undefined) {
          shock = 1
          enter = 0
        }
      }
      if (enter < 1) enter = Math.min(1, enter + dt / 0.95)
      if (shock > 0) shock = Math.max(0, shock - dt / 1.6)
      hoverGlow += ((state.playing ? 1 : 0) - hoverGlow) * Math.min(1, dt * 4)
      if (ripple > 0) ripple = Math.max(0, ripple - dt / 1.05)
      if (meteorLife > 0) {
        meteorLife = Math.max(0, meteorLife - dt / 1.25)
      } else if (!calm()) {
        meteorWait -= dt
        if (meteorWait <= 0) {
          meteorWait = 7 + rng() * 9
          meteorLife = 1
          const lean = 0.2 + rng() * 0.26
          const swift = 300 + rng() * 220
          meteorX = width * (-0.12 + rng() * 0.72)
          meteorY = height * (0.04 + rng() * 0.42)
          meteorVX = Math.cos(lean) * swift
          meteorVY = Math.sin(lean) * swift
          meteorTail = 70 + rng() * 80
        }
      }

      const roam = state.playing ? face.sequenceAt(now) : undefined
      let scheme = schemeOf(0, state.settings.palette)
      let magnitude = 0.55
      if (roam !== undefined) {
        const mix = roam.mix
        for (let i = 0; i < 256; i++) profile[i] = roam.a.profile[i]! + (roam.b.profile[i]! - roam.a.profile[i]!) * mix
        scheme = schemeOf(mix < 0.5 ? roam.a.schemeBase : roam.b.schemeBase, state.settings.palette)
        magnitude = roam.a.magnitude + (roam.b.magnitude - roam.a.magnitude) * mix
      } else if (state.point !== undefined) {
        profile.set(state.point.profile)
        scheme = schemeOf(state.point.schemeBase, state.settings.palette)
        magnitude = state.point.magnitude
      } else {
        for (let i = 0; i < 256; i++) {
          profile[i] = 0.32 + 0.26 * Math.sin(i * 0.105 + now * 0.0009) + 0.17 * Math.sin(i * 0.037 - now * 0.0013)
        }
      }

      // One angular velocity only, always positive: the density-wave pattern
      // turns as a rigid body, while `theta` reaches backwards as it winds out
      // (`WIND < 0`), so the arms trail the spin — a leading arm is not
      // physical. Reduced motion keeps a slow drift instead of freezing the
      // canvas: a still galaxy reads as a broken plugin, and Windows
      // "animation effects: off" is common enough for that to be the first
      // thing people report. It runs at about a fifth of the normal speed, so
      // one turn takes some six minutes instead of one.
      // The user's tier multiplies both paths; calm keeps a floor so that
      // calm + low stays a visible drift instead of returning to the freeze.
      const tier = speedScale(state.settings.speed)
      const speed = calm()
        ? Math.max(0.016, 0.022 * tier)
        : (0.045 + magnitude * 0.08 + hoverGlow * 0.11) * tier
      angle += dt * speed
      const target = state.playing ? 1.16 : state.point === undefined ? 0.66 : 0.8 + magnitude * 0.28
      energy += (target - energy) * Math.min(1, dt * 3)

      // Ease the parallax so the field drifts instead of tracking the cursor.
      const ease = Math.min(1, dt * 3.4)
      parallaxX += (parallaxTargetX - parallaxX) * ease
      parallaxY += (parallaxTargetY - parallaxY) * ease
      const driftX = calm() ? 0 : parallaxX * 5
      const driftY = calm() ? 0 : parallaxY * 4

      const midX = width / 2
      const midY = height * 0.51
      const cx = midX + driftX
      const cy = midY + driftY
      // A very slow breath of the whole disc keeps the still moments alive; a
      // global scale never changes the phase of the arms.
      const breath = calm() ? 1 : 1 + Math.sin(now * 0.00021) * 0.016
      const radius = Math.max(40, Math.min(width * 0.41, height * 0.44) * energy * breath)
      const paletteName = PALETTE_NAMES[state.settings.palette % PALETTE_NAMES.length] ?? PALETTE_NAMES[0]

      // Opaque deep-space base; keeps contrast independent of the host theme.
      const bg = ctx.createRadialGradient(cx, cy * 0.86, 0, cx, cy, Math.max(width, height) * 0.92)
      bg.addColorStop(0, '#0b1026')
      bg.addColorStop(0.42, '#060a19')
      bg.addColorStop(0.78, '#040611')
      bg.addColorStop(1, '#020308')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'

      // Wide ambient bloom: a cool deep-space base under the family colours.
      const ambient = ctx.createRadialGradient(cx, cy, radius * 0.04, cx, cy, Math.max(width, height) * 0.58)
      ambient.addColorStop(0, 'rgba(86, 132, 255, 0.11)')
      ambient.addColorStop(0.3, hexToRgba(scheme.accent, 0.07))
      ambient.addColorStop(0.62, 'rgba(122, 82, 255, 0.045)')
      ambient.addColorStop(1, 'rgba(2, 3, 8, 0)')
      ctx.fillStyle = ambient
      ctx.fillRect(0, 0, width, height)

      for (const cloud of clouds) {
        const pv = profile[cloud.band]!
        const theta = cloud.arm * (TAU / 4) + cloud.t * WIND + pv * WIND_WOBBLE + angle * 0.8 + Math.sin(cloud.t * 17 + cloud.arm) * 0.035
        const r = radius * (0.06 + cloud.t * 1.02) * (0.92 + pv * 0.16) * (1 + Math.sin(cloud.t * 23 + cloud.arm * 2) * 0.025)
        const x = cx + Math.cos(theta) * r
        const y = cy + Math.sin(theta) * r * PERSPECTIVE
        const size = radius * cloud.size * (2.4 + pv * 1.2)
        ctx.globalAlpha = cloud.alpha * (0.45 + pv * 0.9) * (0.5 + enter * 0.5)
        ctx.drawImage(sprites.get(scheme.arms[cloud.tint % 4]!), x - size / 2, y - size / 2, size, size)
      }

      // Continuous spiral spines give the arms a readable shape. Each layer is
      // stroked while the colour itself carries a radial alpha ramp: the band
      // fades out where the arm leaves the disc, so a wide stroke never ends in
      // a flat cut (at 30 px wide that read as a ribbon sheared off with
      // scissors). Several widths with rising alpha replace one flat ribbon,
      // which gives the cross section a gradient instead of two hard edges.
      const radialFade = (color: string): CanvasGradient => {
        const gradient = ctx.createRadialGradient(cx, cy, radius * 0.02, cx, cy, radius * 1.04)
        gradient.addColorStop(0, hexToRgba(color, 0))
        gradient.addColorStop(0.16, hexToRgba(color, 1))
        gradient.addColorStop(0.8, hexToRgba(color, 0.88))
        gradient.addColorStop(1, hexToRgba(color, 0))
        return gradient
      }
      const spineFade = [radialFade(scheme.arms[1]!), radialFade(scheme.accent), radialFade(scheme.core)]
      ctx.lineJoin = 'round'
      for (let arm = 0; arm < 4; arm++) {
        const spine = new Path2D()
        for (let step = 0; step <= 44; step++) {
          const t = 0.09 + (step / 44) * 0.91
          const pv = profile[Math.min(255, Math.floor(t * 255))]!
          const theta = arm * (TAU / 4) + t * WIND + pv * WIND_WOBBLE + angle * 0.8
          const r = radius * (0.06 + t * 1.02) * (0.92 + pv * 0.16)
          const x = cx + Math.cos(theta) * r
          const y = cy + Math.sin(theta) * r * PERSPECTIVE
          if (step === 0) spine.moveTo(x, y)
          else spine.lineTo(x, y)
        }
        for (const [width, alpha, tone] of [[52, 0.007, 0], [34, 0.012, 0], [23, 0.017, 0], [13, 0.024, 0], [7, 0.032, 1]] as const) {
          ctx.globalAlpha = alpha
          ctx.lineWidth = width
          ctx.strokeStyle = spineFade[tone]!
          ctx.stroke(spine)
        }
        ctx.globalAlpha = 0.16
        ctx.lineWidth = 1.25
        ctx.strokeStyle = spineFade[2]!
        ctx.stroke(spine)

        // A parallel, softer lane widens the arm on one side.
        const lane = new Path2D()
        for (let step = 0; step <= 36; step++) {
          const t = 0.12 + (step / 36) * 0.88
          const pv = profile[Math.min(255, Math.floor(t * 255))]!
          const theta = arm * (TAU / 4) + t * WIND + pv * WIND_WOBBLE + angle * 0.8 + WIND * 0.04
          const r = radius * (0.06 + t * 1.02) * (0.92 + pv * 0.16) * 0.99
          const x = cx + Math.cos(theta) * r
          const y = cy + Math.sin(theta) * r * PERSPECTIVE
          if (step === 0) lane.moveTo(x, y)
          else lane.lineTo(x, y)
        }
        for (const [width, alpha] of [[20, 0.012], [11, 0.018]] as const) {
          ctx.globalAlpha = alpha
          ctx.lineWidth = width
          ctx.strokeStyle = spineFade[0]!
          ctx.stroke(lane)
        }
      }

      // Soft band stamps: a continuous nebular body under the sparkle.
      for (let arm = 0; arm < 4; arm++) {
        for (let step = 0; step <= 80; step++) {
          const t = 0.05 + (step / 80) * 0.95
          const pv = profile[Math.min(255, Math.floor(t * 255))]!
          const theta = arm * (TAU / 4) + t * WIND + pv * WIND_WOBBLE + angle * 0.8 + Math.sin(t * 9 + arm) * 0.018
          const r = radius * (0.06 + t * 1.02) * (0.92 + pv * 0.16) * (1 + Math.sin(t * 7 + arm) * 0.018)
          const x = cx + Math.cos(theta) * r
          const y = cy + Math.sin(theta) * r * PERSPECTIVE
          const size = radius * (0.17 + t * 0.13) * (0.9 + pv * 0.5)
          const tint = clamp(Math.floor(t * 3.15), 0, 3)
          const base = (0.017 + pv * 0.024) * (0.35 + enter * 0.65)
          for (const [scale, weight] of [[0.95, 0.6], [1.75, 0.4]] as const) {
            const spread = size * scale
            ctx.globalAlpha = base * weight
            ctx.drawImage(sprites.get(scheme.arms[tint]!), x - spread / 2, y - spread / 2, spread, spread)
          }
        }
      }

      // Arm particles: dense colored dust, brightest in the mid disk.
      const armCount = Math.floor(arms.length * density)
      for (let index = 0; index < armCount; index++) {
        const particle = arms[index]!
        const pv = profile[particle.band]!
        const theta = particle.arm * (TAU / 4) + particle.t * WIND + pv * WIND_WOBBLE + particle.jitter + angle * 0.8
        const r = radius * (0.06 + particle.t * 1.02) * (0.92 + pv * 0.16) * (1 + particle.radial)
        const wobble = 1 + Math.sin(now * 0.0008 + particle.wobble) * 0.008
        const x = cx + Math.cos(theta) * r * wobble
        const y = cy + Math.sin(theta) * r * PERSPECTIVE * wobble
        const fade = (0.35 + 0.65 * Math.min(1, particle.t * 2.4)) * (0.35 + enter * 0.65)
        const size = (3.4 + particle.t * 8.4 + pv * 6) * (0.7 + particle.size * 0.55)
        const color = particle.hot ? scheme.core : scheme.arms[particle.tint]!
        ctx.globalAlpha = (0.024 + pv * 0.09) * fade * (particle.hot ? 1.7 : 1)
        ctx.drawImage(sprites.get(color), x - size / 2, y - size / 2, size, size)
        // A short wake at an earlier phase makes the trailing direction legible.
        if (!calm() && (particle.hot || index % 5 === 0)) {
          const wakeTheta = theta - 0.022 - particle.t * 0.022
          const wakeSize = size * 0.78
          ctx.globalAlpha = (0.024 + pv * 0.09) * fade * (particle.hot ? 0.7 : 0.3)
          ctx.drawImage(
            sprites.get(color),
            cx + Math.cos(wakeTheta) * r * wobble - wakeSize / 2,
            cy + Math.sin(wakeTheta) * r * PERSPECTIVE * wobble - wakeSize / 2,
            wakeSize,
            wakeSize,
          )
        }
        if (particle.hot || index % 3 === 0) {
          const halo = size * (particle.hot ? 2.5 : 1.9)
          ctx.globalAlpha = (particle.hot ? 0.08 : 0.03) * fade
          ctx.drawImage(sprites.get(particle.hot ? scheme.accent : color), x - halo / 2, y - halo / 2, halo, halo)
        }
      }

      // Beads of light creep out along each arm: a slow, one-way pulse that
      // reads as star formation propagating down the density wave.
      if (!calm()) {
        for (let bead = 0; bead < 4; bead++) {
          const k = (now * 0.000075 + bead / 4) % 1
          const t = 0.16 + k * 0.78
          const pv = profile[Math.min(255, Math.floor(t * 255))]!
          const theta = bead * (TAU / 4) + t * WIND + pv * WIND_WOBBLE + angle * 0.8
          const r = radius * (0.06 + t * 1.02) * (0.92 + pv * 0.16)
          const size = radius * (0.075 - k * 0.02)
          ctx.globalAlpha = Math.sin(Math.PI * k) * 0.13 * (0.35 + enter * 0.65)
          ctx.drawImage(
            sprites.get(scheme.accent),
            cx + Math.cos(theta) * r - size / 2,
            cy + Math.sin(theta) * r * PERSPECTIVE - size / 2,
            size,
            size,
          )
        }
      }

      // Foreground bokeh drifts slower than the pattern: in a real disc the
      // outer material lags the inner region, and this bokeh rings the rim.
      for (const mote of motes) {
        const theta = mote.theta + angle * 0.25
        const r = radius * mote.r * (0.98 + Math.sin(now * 0.0004 + mote.phase) * 0.02)
        const x = cx + Math.cos(theta) * r
        const y = cy + Math.sin(theta) * r * PERSPECTIVE
        const size = mote.size * (0.8 + Math.sin(now * 0.001 + mote.phase) * 0.2)
        ctx.globalAlpha = 0.035
        ctx.drawImage(sprites.get(scheme.arms[mote.tint]!), x - size / 2, y - size / 2, size, size)
      }

      // Stars: pinpricks plus a few four-point sparkles. Stars close to the
      // cursor glint, so the field answers the pointer without extra motion.
      const starCount = Math.floor(stars.length * density)
      const accentStar = hexToRgba(scheme.accent, 1)
      for (let index = 0; index < starCount; index++) {
        const star = stars[index]!
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(star.phase + now * 0.001 * star.speed))
        const x = star.x * width + Math.sin(now * 0.00008 + star.phase) * 6 + driftX * 2.6
        const y = star.y * height + Math.cos(now * 0.00006 + star.phase) * 4 + driftY * 2.2
        let glint = 0
        if (pointerIn && !calm()) {
          const gx = x - pointerX
          const gy = y - pointerY
          const d2 = gx * gx + gy * gy
          if (d2 < 8100) {
            glint = 1 - Math.sqrt(d2) / 90
            glint *= glint
          }
        }
        ctx.globalAlpha = twinkle * (0.62 + glint * 0.85)
        ctx.fillStyle = star.tint === 3 && index % 7 === 0 ? accentStar : STAR_TINTS[star.tint]!
        ctx.fillRect(x, y, star.size, star.size)
        if (star.size > 1.55) {
          ctx.globalAlpha = twinkle * 0.22
          ctx.fillRect(x - 3, y + star.size / 2 - 0.25, 6 + star.size, 0.5)
          ctx.fillRect(x + star.size / 2 - 0.25, y - 3, 0.5, 6 + star.size)
        }
      }

      // A meteor crosses the field every ten-odd seconds: one gradient line
      // and one sprite, so the cost stays flat.
      if (meteorLife > 0 && !calm()) {
        const env = Math.min(1, (1 - meteorLife) * 6) * Math.min(1, meteorLife * 1.8)
        const travelled = (1 - meteorLife) * 1.25
        const hx = meteorX + meteorVX * travelled
        const hy = meteorY + meteorVY * travelled
        const speed = Math.hypot(meteorVX, meteorVY) || 1
        const tailX = hx - (meteorVX / speed) * meteorTail
        const tailY = hy - (meteorVY / speed) * meteorTail
        const streak = ctx.createLinearGradient(tailX, tailY, hx, hy)
        streak.addColorStop(0, hexToRgba(scheme.accent, 0))
        streak.addColorStop(0.72, hexToRgba(scheme.accent, 0.16 * env))
        streak.addColorStop(1, hexToRgba(scheme.core, 0.62 * env))
        ctx.globalAlpha = 1
        ctx.strokeStyle = streak
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.moveTo(tailX, tailY)
        ctx.lineTo(hx, hy)
        ctx.stroke()
        ctx.globalAlpha = env
        const head = 7
        ctx.drawImage(sprites.get(scheme.core), hx - head / 2, hy - head / 2, head, head)
      }

      // The old pass here drew 64 straight radial rays. They read as hard beams
      // fanning out of the star, which fought the soft light, so the disc now
      // gets its texture from the sheared wisps below: short arcs that follow
      // the flow at a constant radius, never a straight line pointing at the core.
      ctx.globalAlpha = 1
      const wispCount = Math.floor(52 * density)
      for (let i = 0; i < wispCount; i++) {
        const pv = profile[(i * 11) % 256]!
        if (pv < 0.24) continue
        const theta0 = angle * 1.12 + (i / wispCount) * TAU
        const r = radius * (0.18 + ((i * 29) % 97) / 97 * 0.8) * (0.94 + pv * 0.1)
        const span = 0.03 + pv * 0.05
        ctx.beginPath()
        for (let step = 0; step <= 3; step++) {
          const theta = theta0 + (step / 3) * span
          const x = cx + Math.cos(theta) * r
          const y = cy + Math.sin(theta) * r * PERSPECTIVE
          if (step === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = hexToRgba(scheme.arms[(i + 1) % 4]!, 0.03 + pv * 0.05)
        ctx.lineWidth = 0.5 + pv * 0.7
        ctx.stroke()
      }

      // Chromatic core: a wide dim halo, a small bright nucleus, and a four point
      // flare whose gradient starts at zero. Every layer stays under the additive
      // clipping threshold, so the centre reads as light with no visible rim —
      // the white disc that used to sit there was the clipping contour itself.
      const coreSize = (10 + magnitude * 8) * (1 + Math.sin(now * 0.002) * 0.04) * (0.9 + enter * 0.1)
      ctx.globalAlpha = 0.3
      ctx.drawImage(sprites.get(scheme.accent), cx - coreSize * 4.8, cy - coreSize * 4.8, coreSize * 9.6, coreSize * 9.6)
      ctx.globalAlpha = 0.2
      ctx.drawImage(sprites.get(scheme.core), cx - coreSize * 2.7, cy - coreSize * 2.7, coreSize * 5.4, coreSize * 5.4)
      ctx.globalAlpha = 0.58
      ctx.drawImage(sprites.get(scheme.core), cx - coreSize * 1.05, cy - coreSize * 1.05, coreSize * 2.1, coreSize * 2.1)

      // Flares are tapered diamonds, not rectangles: the silhouette itself thins
      // toward the tip, so nothing reads as a straight beam.
      ctx.save()
      ctx.translate(cx, cy)
      for (let spike = 0; spike < 4; spike++) {
        const reach = coreSize * (spike < 2 ? 2.5 : 1.8)
        const waist = coreSize * 0.1
        ctx.save()
        ctx.rotate((spike * Math.PI) / 2)
        const flare = ctx.createLinearGradient(0, 0, reach, 0)
        flare.addColorStop(0, hexToRgba(scheme.core, 0.3))
        flare.addColorStop(0.3, hexToRgba(scheme.core, 0.14))
        flare.addColorStop(0.7, hexToRgba(scheme.accent, 0.04))
        flare.addColorStop(1, hexToRgba(scheme.accent, 0))
        ctx.fillStyle = flare
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(reach * 0.34, -waist)
        ctx.lineTo(reach, 0)
        ctx.lineTo(reach * 0.34, waist)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      ctx.restore()

      // One white pinprick keeps the star sharp after the halo is softened.
      ctx.globalAlpha = 1
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(1, coreSize * 0.075), 0, TAU)
      ctx.fill()

      // HUD orbit: no solid circle, just ticks and two dashed rings.
      ctx.globalAlpha = 1
      ctx.setLineDash([1.5, 6])
      ctx.strokeStyle = hexToRgba(scheme.arms[2]!, 0.17)
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 0.72, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([1, 9])
      ctx.strokeStyle = hexToRgba(scheme.accent, 0.1)
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 0.36, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])

      for (let i = 0; i < 96; i++) {
        const theta = -Math.PI / 2 + (i / 96) * TAU + angle * 0.16
        const long = i % 8 === 0
        const r1 = radius * 1.06
        const r2 = r1 + (long ? 6.5 : 2.2)
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(theta) * r1, cy + Math.sin(theta) * r1)
        ctx.lineTo(cx + Math.cos(theta) * r2, cy + Math.sin(theta) * r2)
        ctx.strokeStyle = hexToRgba(scheme.core, long ? 0.26 : 0.1)
        ctx.lineWidth = long ? 1 : 0.55
        ctx.stroke()
      }

      if (shock > 0) {
        const k = 1 - shock
        ctx.beginPath()
        ctx.arc(cx, cy, radius * (1.04 + k * 0.55), 0, TAU)
        ctx.strokeStyle = hexToRgba(scheme.core, shock * 0.3)
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(cx, cy, radius * (0.98 + k * 0.3), 0, TAU)
        ctx.strokeStyle = hexToRgba(scheme.accent, shock * 0.18)
        ctx.lineWidth = 2.5
        ctx.stroke()
      }

      // Click impulse: two rings expanding from the tap, gone in about a second.
      if (ripple > 0 && !calm()) {
        const k = 1 - ripple
        const spread = 18 + k * 140
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(rippleX, rippleY, spread, 0, TAU)
        ctx.strokeStyle = hexToRgba(scheme.accent, ripple * 0.3)
        ctx.lineWidth = 1.1
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(rippleX, rippleY, spread * 0.6, 0, TAU)
        ctx.strokeStyle = hexToRgba(scheme.core, ripple * 0.16)
        ctx.lineWidth = 0.7
        ctx.stroke()
      }

      if (roam !== undefined) {
        const theta = angle * 1.9 + roam.index * 0.38
        const x = cx + Math.cos(theta) * radius * 0.56
        const y = cy + Math.sin(theta) * radius * 0.42
        const size = 15 + Math.sin(now * 0.01) * 3
        ctx.globalAlpha = 0.95
        ctx.drawImage(sprites.get(scheme.core), x - size / 2, y - size / 2, size, size)
        ctx.globalAlpha = 0.3
        ctx.drawImage(sprites.get(scheme.accent), x - size * 1.7, y - size * 1.7, size * 3.4, size * 3.4)
      }

      ctx.restore()

      // Edge vignette, then HUD typography. The vignette stays anchored to the
      // frame, not to the drifting nebula.
      const vignette = ctx.createRadialGradient(midX, midY, radius * 0.52, midX, midY, Math.max(width, height) * 0.8)
      vignette.addColorStop(0, 'rgba(2, 3, 8, 0)')
      vignette.addColorStop(0.65, 'rgba(2, 3, 8, 0.16)')
      vignette.addColorStop(1, 'rgba(2, 3, 8, 0.62)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, width, height)

      // Grain last over the vignette: one patterned fill, static in screen
      // space, so it reads as film texture rather than noise crawling around.
      if (grainCtx !== null && !calm()) {
        if (grainPattern === null) grainPattern = ctx.createPattern(grainTile, 'repeat')
        if (grainPattern !== null) {
          ctx.globalCompositeOperation = 'overlay'
          ctx.globalAlpha = 0.06
          ctx.fillStyle = grainPattern
          ctx.fillRect(0, 0, width, height)
          ctx.globalAlpha = 1
          ctx.globalCompositeOperation = 'source-over'
        }
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'
      ctx.shadowBlur = 6
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(178, 210, 255, 0.58)'
      ctx.fillText(`VEC ${state.settings.dims}`, 12, 11)
      ctx.fillStyle = 'rgba(178, 210, 255, 0.36)'
      ctx.fillText(`Σ ${magnitude.toFixed(3)}`, 12, 24)
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(188, 222, 255, 0.5)'
      const schemeLabel = `${scheme.name} · ${paletteName}`
      if (ctx.measureText(schemeLabel).width > width - 140) ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      ctx.fillText(schemeLabel, width - 12, 11)
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      ctx.fillStyle = 'rgba(178, 210, 255, 0.32)'
      ctx.fillText(roam !== undefined ? `TOKEN ${roam.index + 1}` : `PHASE ${((angle % TAU) + TAU).toFixed(2)}`, width - 12, 24)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillStyle = 'rgba(178, 210, 255, 0.34)'
      const roamLabel = roam !== undefined ? roam.label : state.point === undefined ? 'AWAITING SIGNAL' : `TOK ${state.point.tokens}`
      if (ctx.measureText(roamLabel).width > width - 100) ctx.font = '8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      ctx.fillText(roamLabel.slice(0, 24), 12, height - 10)
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
      ctx.textAlign = 'right'
      ctx.fillText('DSH / NEBULA', width - 12, height - 10)
      ctx.shadowBlur = 0
    }

    const frame = (now: number): void => {
      raf = 0
      if (disposed || !visible || document.hidden) return
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

    resize()
    host.addEventListener('pointermove', onPointerMove, { passive: true })
    host.addEventListener('pointerleave', onPointerLeave)
    host.addEventListener('pointerdown', onPointerDown, { passive: true })
    const observer = new ResizeObserver(() => {
      resize()
    })
    observer.observe(host)
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting)
      if (visible) start()
      else stop()
    }, { threshold: 0.04 })
    intersection.observe(host)
    const onVisibility = (): void => {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    start()

    return () => {
      disposed = true
      stop()
      host.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('pointerleave', onPointerLeave)
      host.removeEventListener('pointerdown', onPointerDown)
      observer.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [face])

  return (
    <div ref={hostRef} className="dnp-canvas-host">
      <canvas ref={canvasRef} className="dnp-canvas" />
    </div>
  )
}
