/**
 * Physics regression for the nebula: mounts the real NebulaCanvas on a blank
 * page (stub React, real 2D canvas), then measures the painted image and
 * checks the invariants the panel is supposed to obey:
 *
 *   1. the whole pattern rotates clockwise on screen (positive theta);
 *   2. the arms trail that spin: their 4th-harmonic phase must *decrease* with
 *      radius, because the pattern turns towards +theta. A positive slope would
 *      mean the outer tip reaches any azimuth before the inner part, i.e. a
 *      leading arm, which no real disc has;
 *   3. the pointer parallax moves the field and returns to rest.
 *
 * The measurement deliberately samples an annulus in the mid-disc: the outer
 * HUD ring and the static star field would otherwise swamp the angular signal.
 *
 * Usage: node scripts/verify-physics.mjs
 *        node scripts/verify-physics.mjs --reduced
 *        node scripts/verify-physics.mjs --reduced --motion=full
 */
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChromium } from './lib/browser.mjs'

const argv = process.argv.slice(2)
const reduced = argv.includes('--reduced')
const motion = argv.find((arg) => arg.startsWith('--motion='))?.slice('--motion='.length) ?? 'auto'
/** Which invariant set this run asserts; see the check block at the bottom. */
const mode = reduced && motion !== 'full' ? 'calm' : 'full'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const harness = join(root, 'scripts', 'physics')
const shots = join(root, '.shots')
mkdirSync(shots, { recursive: true })

const reactStub = {
  name: 'react-stub',
  setup(builder) {
    builder.onResolve({ filter: /^react($|\/)/ }, (args) => {
      if (args.path === 'react') return { path: join(harness, 'fake-react.mjs') }
      if (args.path === 'react/jsx-runtime') return { path: join(harness, 'fake-jsx-runtime.mjs') }
      return { path: args.path, external: true }
    })
  },
}

const { outputFiles } = await build({
  entryPoints: [join(harness, 'mount.mjs')],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
  jsx: 'automatic',
  plugins: [reactStub],
  logLevel: 'warning',
})
const bundle = outputFiles[0].text

const browser = await launchChromium({
  args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
})
const page = await browser.newPage({ viewport: { width: 640, height: 480 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})

await page.setContent(`<!doctype html><meta charset="utf-8">
<style>
  html, body { margin: 0; background: #05060c; }
  #frame { position: absolute; inset: 20px auto auto 20px; width: 520px; height: 352px; }
  #root { width: 100%; height: 100%; }
  .dnp-canvas-host, .dnp-canvas { width: 100%; height: 100%; display: block; }
</style>
<div id="frame"><div id="root"></div></div>`)
if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
if (motion !== 'auto') await page.evaluate((value) => { window.__nebulaMotion = value }, motion)
await page.addScriptTag({ content: bundle })

if ((await page.evaluate(() => window.__nebulaMounted === true)) !== true) {
  console.log('FAIL canvas did not mount')
  process.exit(1)
}

// Mirrors the disc radius used by the draw loop, so the samples stay on the arms.
const GRAB = `(() => {
  const canvas = document.querySelector('.dnp-canvas')
  const context = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  const { data } = context.getImageData(0, 0, width, height)
  const cx = width / 2
  const cy = height * 0.51
  const disc = Math.min(width * 0.41, height * 0.44) * 1.02

  const sums = new Float64Array(360)
  const counts = new Float64Array(360)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const luminance = data[offset] + data[offset + 1] + data[offset + 2]
      const nx = (x - cx) / disc
      const ny = (y - cy) / (disc * 0.64)
      const radius = Math.hypot(nx, ny)
      if (radius < 0.24 || radius > 0.78) continue
      const angle = Math.atan2(ny, nx)
      const bin = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 360) % 360
      sums[bin] += luminance
      counts[bin] += 1
    }
  }
  const means = Array.from(sums, (value, index) => (counts[index] > 0 ? value / counts[index] : 0))

  // The 4th angular harmonic per radius follows the arm ridge.
  const phases = []
  for (let step = 0; step <= 72; step++) {
    const radius = 0.16 + (step / 72) * 0.8
    let cosine = 0
    let sine = 0
    for (let bin = 0; bin < 360; bin++) {
      const theta = (bin / 360) * Math.PI * 2
      const sx = Math.round(cx + Math.cos(theta) * radius * disc)
      const sy = Math.round(cy + Math.sin(theta) * radius * disc * 0.64)
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue
      const offset = (sy * width + sx) * 4
      const luminance = Math.max(0, data[offset] + data[offset + 1] + data[offset + 2] - 90)
      cosine += luminance * Math.cos(4 * theta)
      sine += luminance * Math.sin(4 * theta)
    }
    phases.push({ r: radius, phase: (Math.atan2(sine, cosine) * 180) / Math.PI / 4 })
  }

  return { means, phases, disc }
})()`

const grab = () => page.evaluate(GRAB)

/** b(θ) = a(θ − Δ): a positive Δ means the pattern advanced clockwise. */
const angularShift = (a, b) => {
  const meanA = a.reduce((sum, value) => sum + value, 0) / a.length
  const meanB = b.reduce((sum, value) => sum + value, 0) / b.length
  let best = { shift: 0, corr: -Infinity }
  for (let shift = -45; shift <= 45; shift++) {
    let numerator = 0
    let denomA = 0
    let denomB = 0
    for (let i = 0; i < a.length; i++) {
      const x = a[(i + shift + a.length) % a.length] - meanA
      const y = b[i] - meanB
      numerator += x * y
      denomA += x * x
      denomB += y * y
    }
    const corr = numerator / Math.sqrt(denomA * denomB || 1)
    if (corr > best.corr) best = { shift, corr }
  }
  return { advanced: -best.shift, correlation: best.corr }
}

// Calm mode turns at about a degree per second, i.e. less than one angular bin
// over the default one-second window, so the calm run measures a longer span.
const spanMs = mode === 'calm' ? 6000 : 1000
await page.waitForTimeout(2200)
const first = await grab()
await page.waitForTimeout(spanMs)
const second = await grab()
const rotation = angularShift(first.means, second.means)
rotation.advanced = (rotation.advanced / spanMs) * 1000

// Unwrap the 4th-harmonic phase across radius (it repeats every 90°) and fit.
let unwrapped = 0
const points = first.phases.map((entry, index) => {
  if (index === 0) {
    unwrapped = entry.phase
  } else {
    let delta = entry.phase - first.phases[index - 1].phase
    while (delta > 45) delta -= 90
    while (delta < -45) delta += 90
    unwrapped += delta
  }
  return { r: entry.r, theta: unwrapped }
})
const usable = points.filter((entry) => entry.r > 0.25 && entry.r < 0.98)
const meanR = usable.reduce((sum, entry) => sum + entry.r, 0) / usable.length
const meanT = usable.reduce((sum, entry) => sum + entry.theta, 0) / usable.length
let covariance = 0
let variance = 0
for (const entry of usable) {
  covariance += (entry.r - meanR) * (entry.theta - meanT)
  variance += (entry.r - meanR) ** 2
}
const winding = covariance / variance

// Parallax: shove the pointer to the right edge, then leave. The core is a
// compact, nearly symmetric blob, so a patch SSD recovers the translation.
const PATCH = `(() => {
  const canvas = document.querySelector('.dnp-canvas')
  const context = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  const size = 96
  const { data } = context.getImageData(Math.round(width / 2 - size / 2), Math.round(height * 0.51 - size / 2), size, size)
  const patch = new Float32Array(size * size)
  for (let i = 0; i < size * size; i++) patch[i] = data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]
  return Array.from(patch)
})()`

const patchShift = (a, b, size = 96) => {
  let best = { dx: 0, dy: 0, ssd: Infinity }
  for (let dy = -7; dy <= 7; dy++) {
    for (let dx = -7; dx <= 7; dx++) {
      let ssd = 0
      for (let y = 7; y < size - 7; y++) {
        for (let x = 7; x < size - 7; x++) {
          const diff = a[y * size + x] - b[(y + dy) * size + (x + dx)]
          ssd += diff * diff
        }
      }
      if (ssd < best.ssd) best = { dx, dy, ssd }
    }
  }
  return best
}

const restPatch = await page.evaluate(PATCH)
await page.evaluate(() => {
  const host = document.querySelector('.dnp-canvas-host')
  const rect = host.getBoundingClientRect()
  host.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.right - 8, clientY: rect.top + rect.height / 2, bubbles: true }))
})
await page.waitForTimeout(1800)
const pushedPatch = await page.evaluate(PATCH)
await page.evaluate(() => {
  document.querySelector('.dnp-canvas-host').dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
})
await page.waitForTimeout(1800)
const releasedPatch = await page.evaluate(PATCH)
const parallax = patchShift(restPatch, pushedPatch).dx
const settled = patchShift(restPatch, releasedPatch).dx

await page.locator('.dnp-canvas').screenshot({ path: join(shots, 'physics-nebula.png') })
const canvasSize = await page.evaluate(() => {
  const canvas = document.querySelector('.dnp-canvas')
  return { width: canvas.width, height: canvas.height }
})

// Frame budget: the atmosphere layers (grain, meteor, beads, glint) must stay
// cheaper than the compositor can spend. Sampled last so nothing above is
// disturbed.
const fps = await page.evaluate(() => new Promise((resolve) => {
  let frames = 0
  const started = performance.now()
  const tick = () => {
    frames += 1
    const elapsed = performance.now() - started
    if (elapsed < 1200) requestAnimationFrame(tick)
    else resolve(Math.round((frames / elapsed) * 1000))
  }
  requestAnimationFrame(tick)
}))

const report = {
  canvas: `${canvasSize.width}x${canvasSize.height}`,
  clockwiseDegreesPerSecond: Number(rotation.advanced.toFixed(1)),
  rotationCorrelation: Number(rotation.correlation.toFixed(3)),
  windingDegreesPerDiscRadius: Number(winding.toFixed(0)),
  windingSamples: usable.length,
  parallaxPx: parallax,
  parallaxSettledPx: settled,
  fps,
  errors,
}
console.log(JSON.stringify(report, null, 2))

let failed = false
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === undefined ? '' : ` — ${detail}`}`)
  if (!ok) failed = true
}

// Three runs share this script:
//   (default)                  → the full-motion invariants;
//   --reduced                  → the platform asks for less motion, so the panel
//                                must still turn (slower) and drop parallax;
//   --reduced --motion=full    → the user overrode the preference, so the panel
//                                must behave exactly like the default run.
const reducedRun = mode === 'calm'
if (reducedRun) {
  check('calm mode still advances clockwise', rotation.advanced > 0.3 && rotation.advanced < 2.6, `${rotation.advanced.toFixed(1)}°/s`)
  check('calm mode keeps the arm phase coherent', rotation.correlation > 0.9, rotation.correlation.toFixed(3))
  check('calm mode still trails the spin', winding < -120 && winding > -400, `${winding.toFixed(0)}° per disc radius`)
  check('calm mode drops pointer parallax', Math.abs(parallax) < 1, `${parallax} px`)
} else {
  check('pattern advances clockwise', rotation.advanced > 1.5 && rotation.advanced < 9, `${rotation.advanced.toFixed(1)}°/s`)
  check('arm phase is coherent while it turns', rotation.correlation > 0.9, rotation.correlation.toFixed(3))
  check('arms trail the spin', winding < -120 && winding > -400, `${winding.toFixed(0)}° per disc radius (negative = trailing)`)
  check('pointer parallax shifts the field', parallax > 2 && parallax < 9, `${parallax} px`)
  check('parallax settles at rest', Math.abs(settled) < 2.5, `${settled} px`)
}
check('frame budget holds', fps >= 45, `${fps} fps`)
check('no runtime errors', errors.length === 0, errors.slice(0, 2).join(' | '))

writeFileSync(join(shots, 'physics-report.json'), JSON.stringify(report, null, 2))
await browser.close()
process.exit(failed ? 1 : 0)

