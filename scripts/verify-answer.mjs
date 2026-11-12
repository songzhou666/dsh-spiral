import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launchChromium } from './lib/browser.mjs'

const url = process.argv[2]
if (url === undefined) {
  console.error('usage: node scripts/verify-answer.mjs <url-with-token> [tag]')
  process.exit(1)
}
const tag = process.argv[3] ?? 'roam'
const shots = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), '.shots')
mkdirSync(shots, { recursive: true })

const browser = await launchChromium()
const page = await browser.newPage({ viewport: { width: 1460, height: 940 }, deviceScaleFactor: 2 })
const logs = []
page.on('console', (message) => logs.push(`[${message.type()}] ${message.text()}`))
page.on('pageerror', (error) => logs.push(`[pageerror] ${error.message}`))

await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2800)

// Very short prompt so the answer lands inside the wait window.
const composer = page.locator('[contenteditable="true"]').first()
await composer.click()
await page.keyboard.type('用一句话说明什么是星云', { delay: 8 })
await page.keyboard.press('Enter')

await page.locator('.dnp').waitFor({ state: 'visible', timeout: 10000 })
const playButton = page.locator('.dnp-icon[title*="播放"]')
await page
  .waitForFunction(
    () => {
      const button = [...document.querySelectorAll('.dnp-icon')].find((node) => node.title.includes('播放'))
      return button?.title.includes('回答') === true
    },
    undefined,
    { timeout: 70000 },
  )
  .catch(() => {})
const playTitle = await playButton.getAttribute('title')
const footer = await page.locator('.dnp-now-text').textContent().catch(() => null)

if (playTitle !== null && playTitle.includes('回答')) {
  await playButton.click()
  await page.waitForTimeout(1600)
  await page.locator('.dnp-nebula').screenshot({ path: `${shots}\\${tag}-roam-nebula.png`, timeout: 15000 })
  const mapBox = await page.locator('.dnp-map').boundingBox()
  if (mapBox !== null) {
    await page.screenshot({ path: `${shots}\\${tag}-roam-map.png`, clip: mapBox, timeout: 15000 })
  }
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${shots}\\${tag}-roam-full.png`, timeout: 15000 })
  await playButton.click()
}

const info = await page.evaluate(() => {
  const box = document.querySelector('.dnf-window')?.getBoundingClientRect()
  return {
    rect: box ? { left: box.left, top: box.top, width: box.width, height: box.height } : null,
    answerLabel: document.querySelector('.dnp-now-text')?.textContent,
    hudMap: document.querySelector('.dnp-map canvas')?.toDataURL().length,
  }
})
console.log(JSON.stringify({ ...info, footer, playTitle }, null, 2))
console.log('--- console')
console.log(logs.join('\n').slice(0, 4000))
await browser.close()
