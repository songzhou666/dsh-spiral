/**
 * Renders the floating panel on a live server and checks the nebula geometry.
 *
 * The reverted nebula is a fixed four-arm spiral (`TAU / 4`, `t * 4` in the
 * draw loop). Rather than trusting the source, this measures the painted
 * canvas: a bright-pixel angular histogram around the core should be dominated
 * by the 4th harmonic, and the point must sit at the centre of a real disk.
 */
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChromium } from './lib/browser.mjs'

const url = process.argv[2]
if (url === undefined) {
  console.error('usage: node scripts/verify-render.mjs <url-with-token> [tag]')
  process.exit(1)
}
const tag = process.argv[3] ?? 'render'
const shots = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), '.shots')
mkdirSync(shots, { recursive: true })

const browser = await launchChromium()
const page = await browser.newPage({ viewport: { width: 1460, height: 940 }, deviceScaleFactor: 2 })
const logs = []
page.on('console', (message) => logs.push(`[${message.type()}] ${message.text()}`))
page.on('pageerror', (error) => logs.push(`[pageerror] ${error.message}`))

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)

// Submit a short prompt so a real semantic point exists; the panel auto-opens
// for the mounted session, so the nebula has something to draw.
const composer = page.locator('[contenteditable="true"]').first()
await composer.click()
await page.keyboard.type('星云是什么', { delay: 8 })
await page.keyboard.press('Enter')
await page.locator('.dnp').waitFor({ state: 'visible', timeout: 15000 })

// Let several frames land, then measure the nebula canvas.
await page.waitForTimeout(2500)
const metrics = await page.evaluate(() => {
  const canvas = document.querySelector('.dnp-nebula canvas')
  if (canvas === null) return { error: 'no nebula canvas' }
  const width = canvas.width
  const height = canvas.height
  const context = canvas.getContext('2d')
  if (context === null) return { error: 'no 2d context' }
  const { data } = context.getImageData(0, 0, width, height)
  const cx = width / 2
  const cy = height * 0.51
  const bins = new Float64Array(72)
  let lit = 0
  let totalLuminance = 0
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const offset = (y * width + x) * 4
      const luminance = data[offset] + data[offset + 1] + data[offset + 2]
      totalLuminance += luminance
      if (luminance < 90) continue
      lit += 1
      const angle = Math.atan2((y - cy) / 0.64, x - cx)
      const bin = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 72) % 72
      bins[bin] += luminance
    }
  }
  // Harmonic power of the angular profile: 4 arms should light the 4th.
  const mean = bins.reduce((sum, value) => sum + value, 0) / 72
  const harmonics = [1, 2, 3, 4, 5, 6].map((order) => {
    let cosine = 0
    let sine = 0
    for (let index = 0; index < 72; index++) {
      const centred = bins[index] - mean
      const phase = (index / 72) * Math.PI * 2 * order
      cosine += centred * Math.cos(phase)
      sine += centred * Math.sin(phase)
    }
    return { order, power: Math.sqrt(cosine * cosine + sine * sine) / 72 }
  })
  // Local maxima of the smoothed profile: one per visible arm.
  const smooth = Array.from(bins, (value, index) => {
    let sum = 0
    for (let offset = -2; offset <= 2; offset++) sum += bins[(index + offset + 72) % 72]
    return sum / 5
  })
  const peakFloor = Math.max(...smooth) * 0.72
  const peaks = []
  for (let index = 0; index < 72; index++) {
    const value = smooth[index]
    if (value < peakFloor) continue
    if (value < smooth[(index + 1) % 72] || value < smooth[(index + 71) % 72]) continue
    if (peaks.length > 0 && (index - peaks[peaks.length - 1] + 72) % 72 < 10) continue
    peaks.push(index)
  }
  return {
    width,
    height,
    litRatio: lit / ((width / 2) * (height / 2)),
    totalLuminance,
    harmonics,
    dominant: harmonics.reduce((best, current) => (current.power > best.power ? current : best)).order,
    peaks: peaks.length,
    peakAngles: peaks.map((index) => Math.round((index / 72) * 360)),
    profile: Array.from(bins, (value) => Math.round(value / 1000)),
  }
})

await page.locator('.dnp-nebula').screenshot({ path: `${shots}\\${tag}-nebula.png`, timeout: 15000 })
const mapBox = await page.locator('.dnp-map').boundingBox()
if (mapBox !== null) {
  await page.screenshot({ path: `${shots}\\${tag}-map.png`, clip: mapBox, timeout: 15000 })
}
await page.screenshot({ path: `${shots}\\${tag}-full.png`, timeout: 15000 })

const panel = await page.evaluate(() => ({
  window: (() => {
    const box = document.querySelector('.dnf-window')?.getBoundingClientRect()
    return box ? { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width), height: Math.round(box.height) } : null
  })(),
  nowText: document.querySelector('.dnp-now-text')?.textContent ?? null,
  nowMeta: document.querySelector('.dnp-now-meta')?.textContent ?? null,
  mapCanvas: document.querySelector('.dnp-map canvas')?.toDataURL().length ?? 0,
}))

console.log(JSON.stringify({ panel, metrics }, null, 2))
console.log('--- console')
console.log(logs.join('\n').slice(0, 4000))
await browser.close()
