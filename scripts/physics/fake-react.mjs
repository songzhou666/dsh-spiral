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
  return { current: value }
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
