import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { NebulaController } from './controller'
import { schemeOf } from './engine'
import { Panel } from './Panel'
import { NebulaGlyph } from './icons'

/** Key kept from the dsh-nebula era: renaming it would forget the panel position. */
const RECT_KEY = 'dsh-nebula:float:v1'
const MIN_W = 420
const MIN_H = 300
const MAX_W = 760
const MAX_H = 600
const MARGIN = 12

interface Rect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

function viewport(): { width: number; height: number } {
  return {
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clampRect(rect: Rect): Rect {
  const { width: vw, height: vh } = viewport()
  const maxW = Math.min(MAX_W, vw - MARGIN * 2)
  const maxH = Math.min(MAX_H, vh - MARGIN * 2)
  const width = clampNumber(rect.width, Math.min(MIN_W, maxW), maxW)
  const height = clampNumber(rect.height, Math.min(MIN_H, maxH), maxH)
  return {
    width,
    height,
    left: clampNumber(rect.left, MARGIN, Math.max(MARGIN, vw - width - MARGIN)),
    top: clampNumber(rect.top, MARGIN, Math.max(MARGIN, vh - height - MARGIN)),
  }
}

function defaultRect(): Rect {
  const { width: vw, height: vh } = viewport()
  const width = Math.min(520, vw - MARGIN * 2)
  const height = Math.min(352, vh - MARGIN * 2)
  return clampRect({
    width,
    height,
    left: vw - width - 22,
    top: vh - height - 22,
  })
}

function loadRect(): Rect {
  try {
    const raw = localStorage.getItem(RECT_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<Rect>
      if (
        typeof parsed.left === 'number' &&
        typeof parsed.top === 'number' &&
        typeof parsed.width === 'number' &&
        typeof parsed.height === 'number'
      ) {
        return clampRect(parsed as Rect)
      }
    }
  } catch {
    // Ignore unavailable or malformed storage and fall back to the default.
  }
  return defaultRect()
}

function saveRect(rect: Rect): void {
  try {
    localStorage.setItem(RECT_KEY, JSON.stringify(rect))
  } catch {
    // Storage is an enhancement; a denied write must not break the panel.
  }
}

/** Small entry chip shown while the panel is closed. */
function Launcher({ controller, count, enabled, accent }: { controller: NebulaController; count: number; enabled: boolean; accent: string | undefined }): React.ReactElement {
  return (
    <div className="dnf-launcher-wrap">
      <button
        type="button"
        className="dnf-launcher"
        data-off={!enabled}
        style={accent === undefined ? undefined : ({ '--dnf-accent': accent } as CSSProperties)}
        title={enabled ? '打开语义星云' : '语义星云已休眠 · 点击打开'}
        aria-label={enabled ? '打开语义星云' : '语义星云已休眠，点击打开'}
        onClick={() => {
          const sessionId = controller.activeSession()
          if (sessionId !== undefined) controller.requestOpen(sessionId)
        }}
      >
        {enabled ? <NebulaGlyph size={20} /> : <span className="dnf-launcher-moon">☾</span>}
        {count > 0 && <span className="dnf-launcher-count">{count > 99 ? '99+' : count}</span>}
      </button>
    </div>
  )
}

/** Floating, draggable, resizable ivory card; the panel itself mounts only while visible. */
export function FloatingNebula({ controller }: { controller: NebulaController }): React.ReactElement | null {
  const activeId = useSyncExternalStore(controller.subscribeActive, controller.activeSession)
  const visible = useSyncExternalStore(controller.subscribeVisible, controller.isVisible)
  const face = controller.faceFor(activeId ?? '')
  const snapshot = useSyncExternalStore(face.subscribe, face.getSnapshot, face.getSnapshot)
  const [rect, setRect] = useState<Rect>(loadRect)
  const rectRef = useRef(rect)
  rectRef.current = rect
  const drag = useRef<{ x: number; y: number; left: number; top: number } | undefined>(undefined)
  const resize = useRef<{ x: number; y: number; width: number; height: number } | undefined>(undefined)

  useEffect(() => {
    const onResize = (): void => setRect((current) => clampRect(current))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onHeadPointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    if (event.button !== 0) return
    if ((event.target as Element).closest('button, input, [data-no-drag]') !== null) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top }
    event.currentTarget.dataset.dragging = 'true'
  }

  const onHeadPointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
    const state = drag.current
    if (state === undefined) return
    setRect(clampRect({
      ...rect,
      left: state.left + event.clientX - state.x,
      top: state.top + event.clientY - state.y,
    }))
  }

  const onHeadPointerUp = (event: ReactPointerEvent<HTMLElement>): void => {
    if (drag.current === undefined) return
    drag.current = undefined
    delete event.currentTarget.dataset.dragging
    saveRect(rectRef.current)
  }

  const onResizeStart = (event: ReactPointerEvent<HTMLElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    resize.current = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height }
  }

  const onResizeMove = (event: ReactPointerEvent<HTMLElement>): void => {
    const state = resize.current
    if (state === undefined) return
    const { width: vw, height: vh } = viewport()
    setRect((current) => clampRect({
      ...current,
      width: clampNumber(state.width + event.clientX - state.x, MIN_W, Math.min(MAX_W, vw - current.left - MARGIN)),
      height: clampNumber(state.height + event.clientY - state.y, MIN_H, Math.min(MAX_H, vh - current.top - MARGIN)),
    }))
  }

  const onResizeEnd = (): void => {
    if (resize.current === undefined) return
    resize.current = undefined
    saveRect(rectRef.current)
  }

  // The closed chip keeps a trace of the newest signal's palette.
  const latest = snapshot.points[snapshot.points.length - 1]
  const accent = latest === undefined ? undefined : schemeOf(latest.schemeBase, snapshot.settings.palette).accent

  if (!visible) {
    return <Launcher controller={controller} count={snapshot.points.length} enabled={snapshot.settings.enabled} accent={accent} />
  }

  return (
    <div
      className="dnf-window"
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    >
      <Panel
        face={face}
        onClose={() => controller.requestHide()}
        onHeadPointerDown={onHeadPointerDown}
        onHeadPointerMove={onHeadPointerMove}
        onHeadPointerUp={onHeadPointerUp}
      />
      <span
        className="dnf-grip"
        title="拖动调整大小"
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
      />
    </div>
  )
}
