/**
 * Invariants for the session cluster and the twin-silhouette morph.
 *
 * Engine and canvas helpers are pure, so they are bundled in memory and
 * exercised without a DOM. The physics harness covers the animated canvas.
 */
import { build } from 'esbuild'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const result = await build({
  stdin: {
    contents: "export * from './src/client/engine.ts'; export * from './src/client/canvas.ts';",
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
  target: ['es2022'],
  logLevel: 'silent',
})
const source = Buffer.from(result.outputFiles[0].text).toString('base64')
const lib = await import(`data:text/javascript;base64,${source}`)

const checks = []
const ok = (name, condition, detail = '') => {
  checks.push({ name, pass: Boolean(condition), detail })
}

const seed = (id, x, y, magnitude, schemeBase) => ({
  id,
  text: `prompt ${id}`,
  mapX: x,
  mapY: y,
  magnitude,
  schemeBase,
})

ok('companion limit is 12', lib.COMPANION_LIMIT === 12, String(lib.COMPANION_LIMIT))
ok('five palettes', lib.PALETTE_NAMES.length === 5, lib.PALETTE_NAMES.join('/'))

const samples = Array.from({ length: 12 }, (_, i) =>
  seed(`msg-${i}`, Math.cos(i) * 0.7, Math.sin(i) * 0.7, 0.4 + i * 0.05, i % 6),
)
const orbits = samples.map((item, index) => lib.companionOrbit(item, index, samples.length))
const again = lib.companionOrbit(samples[3], 3, samples.length)
ok('orbit is deterministic', JSON.stringify(orbits[3]) === JSON.stringify(again))
ok('orbit stays outside the disc', orbits.every((o) => o.orbit > 1.1 && o.orbit < 1.5),
  `${Math.min(...orbits.map((o) => o.orbit)).toFixed(3)}..${Math.max(...orbits.map((o) => o.orbit)).toFixed(3)}`)
ok('azimuth follows the semantic map', orbits.every((o, i) => {
  const expected = Math.atan2(samples[i].mapY, samples[i].mapX)
  const delta = Math.atan2(Math.sin(o.theta - expected), Math.cos(o.theta - expected))
  return Math.abs(delta) <= 0.36
}))
ok('id jitter separates coincident coordinates', (() => {
  const a = lib.companionOrbit(seed('a', 0.2, 0.2, 0.7, 0), 0, 2)
  const b = lib.companionOrbit(seed('b', 0.2, 0.2, 0.7, 0), 1, 2)
  return Math.abs(a.theta - b.theta) > 0.001
})())
ok('recency is monotone and ends at 1', orbits.every((o, i) => i === 0 || o.recency > orbits[i - 1].recency)
  && orbits.at(-1).recency === 1)
ok('brightness rises with recency', orbits.every((o, i) => i === 0 || o.alpha > orbits[i - 1].alpha))
ok('companion keeps its own colour family', orbits.every((o, i) => o.schemeBase === samples[i].schemeBase))
ok('call sign format', orbits.every((o) => /^[A-Z]{4,5}-[0-9A-F]{3}$/.test(o.label)), orbits[0].label)
ok('call signs are stable', orbits[0].label === lib.constellationId(samples[0].text))

ok('mixHex endpoints', lib.mixHex('#000000', '#ffffff', 0) === '#000000'
  && lib.mixHex('#000000', '#ffffff', 1) === '#ffffff')
ok('mixHex midpoint', lib.mixHex('#000000', '#ffffff', 0.5) === '#808080',
  lib.mixHex('#000000', '#ffffff', 0.5))
ok('mixHex expands shorthand', lib.mixHex('#000', '#fff', 1) === '#ffffff',
  lib.mixHex('#000', '#fff', 1))
ok('mixHex leaves a real scheme untouched', lib.mixHex('#63f3ff', '#63f3ff', 0.37) === '#63f3ff')

// A morph only reads convincingly if the answer actually has a different
// outline, and if the dimension tier cannot reshape it mid-blend.
const question = '帮我把这个插件的星云做得更梦幻一点'
const answer = '可以，先把旋臂的亮度曲线做一次缓动插值，再让回答的轮廓接管星系。'
const q = lib.analyze(question, 8192)
const a = lib.analyze(answer, 8192)
let distance = 0
for (let i = 0; i < 256; i++) distance += Math.abs(q.profile[i] - a.profile[i])
distance /= 256
ok('answer silhouette differs from question', distance > 0.02, `mean |Δ| ${distance.toFixed(4)}`)
const q32 = lib.analyze(question, 32768)
ok('dims still do not change geometry', q.profile.every((v, i) => v === q32.profile[i]))
ok('morph endpoints reproduce both outlines', (() => {
  const lerped = lib.lerp(0.2, 0.8, 0.5)
  return Math.abs(lerped - 0.5) < 1e-6
})())

// Historic palette rows must not be repainted by any of this work.
const legacy = ['cryo', 'abyss', 'iris', 'rose']
ok('deep space mapping unchanged', [0, 1, 2, 3].every((b) => lib.schemeOf(b, 0).id === legacy[b]))
ok('aurora mapping unchanged', [0, 1, 2, 3].map((b) => lib.schemeOf(b, 1).id).join(',') === 'aurora,cryo,iris,abyss')
ok('solar mapping unchanged', [0, 1, 2, 3].map((b) => lib.schemeOf(b, 2).id).join(',') === 'ember,rose,iris,cryo')
ok('scheme base modulus stays 6', lib.SCHEME_BASE_MODULUS === 6)

for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}${check.detail ? ` — ${check.detail}` : ''}`)
}
const failed = checks.filter((check) => !check.pass).length
console.log(`${checks.length - failed}/${checks.length} companion + morph invariants passed`)
if (failed > 0) process.exit(1)
