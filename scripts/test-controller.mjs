import { buildSync } from 'esbuild'
import { resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Bundled to a scratch file: the test must not leave artifacts inside the shipped lib/.
// Kept under node_modules/.cache (never published) rather than the OS temp dir.
const outDir = resolve(root, 'node_modules/.cache/dsh-nebula-test')
mkdirSync(outDir, { recursive: true })
const out = resolve(outDir, 'controller.mjs')
buildSync({
  entryPoints: [resolve(root, 'src/client/controller.ts')],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  logLevel: 'silent',
})

// Minimal browser surface used by the store and controller.
const memory = new Map()
const localStorage = {
  get length() { return memory.size },
  key: (index) => [...memory.keys()][index] ?? null,
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => { memory.set(key, String(value)) },
  removeItem: (key) => { memory.delete(key) },
  clear: () => memory.clear(),
}
globalThis.window = {
  localStorage,
  setTimeout,
  clearTimeout,
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false }),
}
globalThis.document = { activeElement: null, hidden: false }
globalThis.HTMLElement = class HTMLElement {}
globalThis.requestAnimationFrame = (fn) => { fn(0); return 1 }
globalThis.cancelAnimationFrame = () => {}
globalThis.IntersectionObserver = class { observe() {} disconnect() {} }
globalThis.ResizeObserver = class { observe() {} disconnect() {} }

const { NebulaController } = await import(pathToFileURL(out).href)

let notifySession = () => {}
let notifyWindow = () => {}
let sessionSnapshot = { pendingSubmissions: [] }
let windowSnapshot = { entries: [] }
const tabs = [{ sessionId: 's1', tabId: 't1', kind: 'nebula' }]
const visibleEvents = []

const mounted = {
  getSnapshot: () => 's1',
  subscribe: () => () => {},
}
const ctx = {
  sidebarRight: {
    mounted,
    openTabs: { getSnapshot: () => tabs },
    openTab: (kind) => { opened.push(kind) },
    hide: (tabId) => { hidden.push(tabId) },
  },
  sessions: {
    binding: () => ({
      session: {
        getSnapshot: () => sessionSnapshot,
        subscribe: (listener) => { notifySession = listener; return () => { notifySession = () => {} } },
      },
      eventSource: {
        getSnapshot: () => windowSnapshot,
        subscribe: (listener) => { notifyWindow = listener; return () => { notifyWindow = () => {} } },
      },
    }),
  },
}

const controller = new NebulaController(ctx)
controller.subscribeVisible(() => { visibleEvents.push(controller.isVisible()) })
const face = controller.faceFor('s1')

function pending(text, requestId) {
  sessionSnapshot = { pendingSubmissions: [{ requestId, text, time: Date.now() }] }
  notifySession()
}

function durable(text, seq, id) {
  windowSnapshot = {
    entries: [{
      type: 'event',
      event: {
        type: 'user/message',
        seq,
        time: Date.now(),
        data: { id, source: { kind: 'user' }, content: [{ type: 'text', text }] },
      },
    }],
  }
  notifyWindow()
}

function assistant(text, seq, id) {
  windowSnapshot = {
    entries: [{
      type: 'event',
      event: {
        type: 'assistant/message',
        seq,
        time: Date.now(),
        data: {
          message: { id, role: 'assistant', content: [{ type: 'text', text }] },
        },
      },
    }],
  }
  notifyWindow()
}

let failures = 0
function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  if (!pass) failures += 1
  console.log(pass ? 'PASS' : 'FAIL', label, pass ? '' : `got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`)
}

pending('做一个梦幻的星云插件', 'r1')
check('pending captured', face.getSnapshot().points.length, 1)
check('auto opened once', visibleEvents, [true])
check('point id is pending id', face.getSnapshot().points[0].id, 'pending:r1')
check('current set', face.getSnapshot().currentId, 'pending:r1')

durable('做一个梦幻的星云插件', 1, 'm1')
check('durable echo deduped', face.getSnapshot().points.length, 1)

pending('把颜色调得更高级', 'r2')
check('second pending captured', face.getSnapshot().points.length, 2)
durable('把颜色调得更高级', 2, 'm2')
check('second echo deduped', face.getSnapshot().points.length, 2)

durable('历史里的第三条消息', 10, 'm10')
check('history appended without auto-open', face.getSnapshot().points.length, 3)
check('auto open does not re-fire', visibleEvents, [true])

face.play()
check('playing', face.getSnapshot().playing, true)
const roam = face.sequenceAt(performance.now() + 300)
check('roam frame available', roam !== undefined, true)
face.stop()
check('stopped', face.getSnapshot().playing, false)

face.hide()
check('hide forwarded', [controller.isVisible(), visibleEvents], [false, [true, false]])
face.open()
check('open forwarded', [controller.isVisible(), visibleEvents], [true, [true, false, true]])

face.select('pending:r2')
check('selected current', face.getSnapshot().currentId, 'pending:r2')

face.setEnabled(false)
check('settings disabled', controller.settings().enabled, false)
pending('休眠期间不应采集', 'r3')
check('disabled captures nothing', face.getSnapshot().points.length, 3)
face.setEnabled(true)
check('re-enabled captures pending', face.getSnapshot().points.length, 4)

face.setPalette(2)
check('palette applied', controller.settings().palette, 2)
check('palette visible in snapshot', face.getSnapshot().settings.palette, 2)

// 32768 is the top tier: it must persist like any other value, and the retired
// 5120 must land on 8192 instead of surviving as a stale setting.
face.setDims(32768)
check('dims applied', controller.settings().dims, 32768)
check('dims visible in snapshot', face.getSnapshot().settings.dims, 32768)
check('dims persisted', JSON.parse(window.localStorage.getItem('dsh-nebula:settings:v1')).dims, 32768)
face.setDims(16384)
check('dims mid tier applied', controller.settings().dims, 16384)
face.setDims(8192)

check('motion defaults to full', face.getSnapshot().settings.motion, 'full')
face.setMotion('auto')
check('motion applied', controller.settings().motion, 'auto')
check('motion visible in snapshot', face.getSnapshot().settings.motion, 'auto')
check('motion persisted', JSON.parse(window.localStorage.getItem('dsh-nebula:settings:v1')).motion, 'auto')
face.setMotion('full')
check('motion reverts', controller.settings().motion, 'full')

check('speed defaults to mid', face.getSnapshot().settings.speed, 'mid')
face.setSpeed('high')
check('speed applied', controller.settings().speed, 'high')
check('speed visible in snapshot', face.getSnapshot().settings.speed, 'high')
check('speed persisted', JSON.parse(window.localStorage.getItem('dsh-nebula:settings:v1')).speed, 'high')
face.setSpeed('low')
check('speed reverts', controller.settings().speed, 'low')
face.setSpeed('mid')

pending('回答漫游测试', 'r8')
assistant('星云正在缓慢旋转，像深空里的一束极光。', 30, 'a30')
check('answer captured', face.getSnapshot().answer?.text, '星云正在缓慢旋转，像深空里的一束极光。')
check('answer adds no point', face.getSnapshot().points.length, 5)
face.play()
check('answer roam playing', face.getSnapshot().playing, true)
const answerRoam = face.sequenceAt(performance.now() + 300)
check('answer roam frame', answerRoam !== undefined, true)
face.stop()

await new Promise((resolveSleep) => setTimeout(resolveSleep, 420))
const staleSeed = JSON.stringify({ ...controller.settings(), dims: 5120 })
window.localStorage.setItem('dsh-nebula:settings:v1', staleSeed)
const restored = new NebulaController(ctx)
const restoredFace = restored.faceFor('s1')
check('history persisted', restoredFace.getSnapshot().points.length >= 4, true)
// The retired 5120 tier must land on 8192 rather than survive as a dead setting.
check('retired 5120 migrates to 8192', restoredFace.getSnapshot().settings.dims, 8192)
restored.dispose()

face.clear()
check('cleared', face.getSnapshot().points.length, 0)
check('current cleared', face.getSnapshot().currentId, undefined)
check('answer cleared', face.getSnapshot().answer, undefined)
controller.dispose()

if (failures > 0) process.exitCode = 1
