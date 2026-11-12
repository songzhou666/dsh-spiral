// Mounts the real NebulaCanvas on a blank page (no DSH shell, no auth token),
// so the painted result can be measured by scripts/verify-physics.mjs.
import { NebulaCanvas } from '../../src/client/NebulaCanvas.tsx'
import { __begin, __end } from './fake-react.mjs'

const FRAGMENT = Symbol.for('react.fragment')

function render(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (typeof node === 'string' || typeof node === 'number') return document.createTextNode(String(node))
  if (Array.isArray(node)) {
    const fragment = document.createDocumentFragment()
    for (const child of node) {
      const rendered = render(child)
      if (rendered !== null) fragment.appendChild(rendered)
    }
    return fragment
  }
  const { type, props } = node
  if (type === FRAGMENT) {
    const fragment = document.createDocumentFragment()
    for (const child of [].concat(props.children ?? [])) {
      const rendered = render(child)
      if (rendered !== null) fragment.appendChild(rendered)
    }
    return fragment
  }
  if (typeof type === 'function') return render(type(props))
  const element = document.createElement(type)
  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'ref' || value === undefined) continue
    if (key === 'className') element.setAttribute('class', value)
    else if (key === 'style' && typeof value === 'object') Object.assign(element.style, value)
    else element.setAttribute(key, value)
  }
  for (const child of [].concat(props.children ?? [])) {
    const rendered = render(child)
    if (rendered !== null) element.appendChild(rendered)
  }
  if (props.ref !== undefined && props.ref !== null) props.ref.current = element
  return element
}

// motion stays 'auto' here on purpose: these probes exercise the *policy*, so a
// --reduced run must reach the calm path through the media query, not through a
// hand-set default. speed follows the shipped default.
const settings = {
  enabled: true,
  autoOpen: true,
  persist: false,
  dims: window.__nebulaDims ?? 8192,
  palette: 0,
  motion: window.__nebulaMotion ?? 'auto',
  speed: window.__nebulaSpeed ?? 'mid',
}
const face = { sequenceAt: () => undefined }

// A frozen profile keeps the arm brightness fixed, so an angular drift of the
// painted image can only come from the rotation itself.
const profile = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  profile[i] = 0.32 + 0.3 * Math.sin(i * 0.115 + 0.7) + 0.18 * Math.sin(i * 0.041 + 2.1)
}
const point = {
  id: 'physics-fixture',
  text: '恒星形成区',
  time: 0,
  capturedAt: 0,
  profile,
  signed: new Float32Array(8192),
  axis: [0.3, 0.5, 0.8],
  mapX: 0,
  mapY: 0,
  schemeBase: 0,
  magnitude: 0.8,
  tokens: 24,
}

const cell = __begin()
const tree = NebulaCanvas({ face, point, settings, playing: false })
__end()

const root = document.getElementById('root')
root.appendChild(render(tree))
for (const effect of cell.effects) effect()
window.__nebulaMounted = true
