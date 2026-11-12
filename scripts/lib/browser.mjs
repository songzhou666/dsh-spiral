/**
 * One place to launch a headless Chromium for the visual scripts.
 *
 * By default it uses the `playwright` package (and the browser that package
 * installed). When Playwright lives in another checkout — e.g. a global
 * install or a monorepo — point at it without editing any script:
 *
 *   PLAYWRIGHT_MODULE=file:///path/to/playwright/index.mjs \
 *   CHROMIUM_PATH=/path/to/chrome node scripts/verify-physics.mjs
 */
export async function launchChromium(options = {}) {
  const spec = process.env.PLAYWRIGHT_MODULE ?? 'playwright'
  const { chromium } = await import(spec)
  return chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH === undefined ? {} : { executablePath: process.env.CHROMIUM_PATH }),
    ...options,
  })
}
