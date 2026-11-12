import { buildSync } from 'esbuild'
import { resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Bundled to a scratch file: the test must not leave artifacts inside the shipped lib/.
// Kept under node_modules/.cache (never published) rather than the OS temp dir.
const outDir = resolve(root, 'node_modules/.cache/dsh-nebula-test')
mkdirSync(outDir, { recursive: true })
const out = resolve(outDir, 'engine.mjs')
buildSync({
  entryPoints: [resolve(root, 'src/client/engine.ts')],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  logLevel: 'silent',
})

const engine = await import(pathToFileURL(out).href)
const { analyze, sequenceOf, EMBED_DIMS } = engine

const prompts = [
  '帮我把这个插件的星云做得更梦幻一点，颜色要高级',
  'Refactor the session controller so pending submissions are observable',
  '用 Rust 写一个高性能的向量检索服务，支持 HNSW',
  '今天天气不错',
]

let ok = true
// A dimension tier is a render budget only: every tier must place the prompt in
// exactly the same spot and yield the same analysis, so switching tiers never
// reshapes the nebula or moves a star on the map.
for (const text of prompts) {
  const a = analyze(text, 8192)
  const tiers = EMBED_DIMS.map((dims) => [dims, analyze(text, dims)])
  const sameAxis = tiers.every(([, b]) => a.axis.every((value, index) => Math.abs(value - b.axis[index]) < 1e-9))
  const sameMap = tiers.every(([, b]) => Math.abs(a.mapX - b.mapX) < 1e-9 && Math.abs(a.mapY - b.mapY) < 1e-9)
  const sameScheme = tiers.every(
    ([, b]) => a.schemeBase === b.schemeBase && Math.abs(a.magnitude - b.magnitude) < 1e-9,
  )
  ok &&= sameAxis && sameMap && sameScheme
  console.log(
    sameAxis && sameMap && sameScheme ? 'PASS' : 'FAIL',
    text.slice(0, 18).padEnd(20),
    `axis=[${a.axis.map((v) => v.toFixed(3)).join(', ')}]`,
    `map=(${a.mapX.toFixed(3)}, ${a.mapY.toFixed(3)})`,
    `mag=${a.magnitude.toFixed(3)}`,
    `scheme=${a.schemeBase}`,
    `tokens=${a.tokens}`,
    `profile=[${Math.min(...a.profile).toFixed(2)}, ${Math.max(...a.profile).toFixed(2)}]`,
  )
}

const unique = new Set(prompts.map((text) => analyze(text).axis.map((v) => v.toFixed(4)).join(',')))
console.log(unique.size === prompts.length ? 'PASS' : 'FAIL', 'distinct axes', unique.size, '/', prompts.length)

const sequence = sequenceOf(prompts[0])
console.log(sequence.length > 1 ? 'PASS' : 'FAIL', 'sequence frames', sequence.length, 'labels', sequence.slice(0, 6).map((frame) => frame.label))

const started = performance.now()
for (let i = 0; i < 60; i++) analyze(prompts[i % prompts.length])
const elapsed = performance.now() - started
console.log('perf', (elapsed / 60).toFixed(2), 'ms/analyze')

if (!ok) process.exitCode = 1
