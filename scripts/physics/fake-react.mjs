// Minimal React stand-in: NebulaCanvas only uses useEffect + useRef, so one
// synchronous render is enough to run the real effect against a real canvas.
let collector = null

export function __begin() {
  collector = { effects: [] }
  return collector
}

export function __end() {
  collector = null
}

export function useEffect(fn) {
  if (collector !== null) collector.effects.push(fn)
}

export function useRef(value) {
  const ref = { current: value }
  // Collected so preview harnesses can push fresh props into a mounted canvas
  // (e.g. an answer timestamp) without needing a real React renderer.
  if (collector !== null) {
    if (collector.refs === undefined) collector.refs = []
    collector.refs.push(ref)
  }
  return ref
}

export function useState(value) {
  return [typeof value === 'function' ? value() : value, () => {}]
}

export function useMemo(fn) {
  return fn()
}

export function useCallback(fn) {
  return fn
}

export default { useEffect, useRef, useState, useMemo, useCallback }
