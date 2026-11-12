/**
 * Proves the host's 500 ms bundle stat-poll publishes a rebuilt `lib/client.js`
 * without a server restart. The live GUI runs the same composition, so a page
 * refresh (or the SSE graph push) is enough to pick up a new build.
 *
 * Usage: node scripts/verify-hmr.mjs "http://127.0.0.1:3080/?token=<token>"
 * (or set DSH_URL). The token is a local session credential — pass it on the
 * command line, never commit it.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const url = process.argv[2] ?? process.env.DSH_URL
if (url === undefined) {
  console.error('usage: node scripts/verify-hmr.mjs <url-with-token>  (or set DSH_URL)')
  process.exit(1)
}
const bundle = new URL('../lib/client.js', import.meta.url)

const getRev = async () => {
  // The token URL answers 303 and sets the auth cookie; replay it manually
  // because a bare fetch follows the redirect without a cookie jar.
  const auth = await fetch(url, { redirect: 'manual' })
  const cookie = auth.headers.get('set-cookie')?.split(';', 1)[0]
  const html = await (await fetch(new URL('/', url), { headers: cookie === undefined ? {} : { cookie } })).text()
  const match = html.match(/dsh-nebula[\s\S]{0,600}?["']rev["']\s*:\s*["']([0-9a-f]+)["']/)
  return match?.[1] ?? 'NOT FOUND'
}

const before = await getRev()
const bytes = readFileSync(bundle)
writeFileSync(bundle, bytes)
await new Promise(resolve => setTimeout(resolve, 1500))
const after = await getRev()

console.log('rev before', before)
console.log('rev after ', after)
console.log(before !== 'NOT FOUND' && before !== after ? 'PASS rebuilt bundle picked up' : 'FAIL rev unchanged')
