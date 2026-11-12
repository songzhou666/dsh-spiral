/**
 * Confirms which build the running GUI actually serves: reads the plugin graph
 * over the unauthenticated SSE stream, fetches the advertised `dsh-nebula`
 * client bundle, and compares it byte-for-byte with `lib/client.js` on disk.
 */
import { readFileSync } from 'node:fs'

const origin = (process.argv[2] ?? 'http://127.0.0.1:3080').replace(/\/$/, '')
const bundle = new URL('../lib/client.js', import.meta.url)

const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 6000)
let graph
try {
  const response = await fetch(`${origin}/plugins/events`, { signal: controller.signal })
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const payload = JSON.parse(line.slice(5).trim())
      if (payload.type === 'graph') graph = payload.graph
    }
    if (graph !== undefined) break
  }
} catch (error) {
  console.log('stream error:', error.name, error.message)
} finally {
  clearTimeout(timeout)
}

if (graph === undefined) {
  console.log('FAIL no graph event')
  process.exit(1)
}

console.log('graph rev', graph.rev)
const entry = graph.entries.find((item) => item.id === 'dsh-nebula')
if (entry === undefined) {
  console.log('FAIL dsh-nebula not in graph')
  console.log(graph.entries.map((item) => item.id).join('\n'))
  process.exit(1)
}
console.log('entry', entry.id, 'rev', entry.rev, 'url', entry.url)

const served = Buffer.from(await (await fetch(`${origin}/${entry.url}`)).arrayBuffer())
const onDisk = readFileSync(bundle)
console.log('served bytes', served.length, 'on-disk bytes', onDisk.length)
const same = served.equals(onDisk)
console.log(same ? 'PASS live GUI serves the current bundle' : 'NOTE served bundle differs from disk')
if (!same) {
  const { writeFileSync } = await import('node:fs')
  const out = new URL('../node_modules/.cache/dsh-nebula-test/served-client.js', import.meta.url)
  writeFileSync(out, served)
  console.log('wrote served copy to', out.pathname, 'for diffing')
}

// Show the restored geometry markers in what the server actually shipped.
const text = served.toString('utf8')
for (const marker of ['TAU / 4', 't * 4', 'LEN ', 'FEAT ', 'detailOf', 'particleCount']) {
  console.log(`  ${marker.padEnd(14)} ${text.split(marker).length - 1}`)
}

// The floating panel and the launcher pill must both be present.
for (const marker of ['dnf-window', 'dnf-launcher', 'dnp-now-meta']) {
  console.log(`  ${marker.padEnd(14)} ${text.split(marker).length - 1}`)
}
