import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { PALETTE_NAMES } from './engine'
import { formatClock } from './store'
import { motionEnabled, subscribeSystemMotion, systemPrefersReducedMotion } from './motion'
import type { NebulaFace } from './types'
import { NebulaCanvas } from './NebulaCanvas'
import { MapCanvas } from './NebulaMap'
import {
  IconChevron,
  IconCollapse,
  IconMoon,
  IconPalette,
  IconPlay,
  IconPower,
  IconSliders,
  IconSpark,
  IconStop,
} from './icons'
export interface PanelProps {
  readonly face: NebulaFace
  readonly onClose?: () => void
  readonly onHeadPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void
  readonly onHeadPointerMove?: (event: ReactPointerEvent<HTMLElement>) => void
  readonly onHeadPointerUp?: (event: ReactPointerEvent<HTMLElement>) => void
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="dnp-switch"
      data-on={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="dnp-switch-knob" />
    </button>
  )
}

/** The whole side panel: header HUD, dual canvas stage, status footer, settings sheet. */
export function Panel({ face, onClose, onHeadPointerDown, onHeadPointerMove, onHeadPointerUp }: PanelProps): React.ReactElement {
  const snapshot = useSyncExternalStore(face.subscribe, face.getSnapshot, face.getSnapshot)
  const [sheet, setSheet] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [systemReduced, setSystemReduced] = useState(() => systemPrefersReducedMotion())
  const confirmTimer = useRef<number | undefined>(undefined)

  useEffect(() => subscribeSystemMotion(() => setSystemReduced(systemPrefersReducedMotion())), [])

  const settings = snapshot.settings

  // The chassis animations read the same policy as the canvases, so this has to
  // follow both the setting and the system preference.
  useEffect(() => {
    document.documentElement.dataset.dnpMotion = motionEnabled(settings.motion) ? 'full' : 'calm'
  }, [settings.motion, systemReduced])

  const enabled = settings.enabled
  const points = snapshot.points
  const current = points.find((point) => point.id === snapshot.currentId) ?? points.at(-1)
  const playing = snapshot.playing

  const playTitle = playing
    ? '停止语义漫游'
    : snapshot.answer !== undefined
      ? '播放回答语义漫游'
      : '播放输入序列漫游'

  useEffect(() => {
    if (!confirmClear) return
    confirmTimer.current = window.setTimeout(() => setConfirmClear(false), 3200)
    return () => {
      if (confirmTimer.current !== undefined) window.clearTimeout(confirmTimer.current)
    }
  }, [confirmClear])

  useEffect(() => {
    if (!sheet) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setSheet(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])

  const paletteName = PALETTE_NAMES[settings.palette % PALETTE_NAMES.length] ?? PALETTE_NAMES[0]

  return (
    <div className="dnp" data-enabled={enabled} data-playing={playing}>
      <header
        className="dnp-head"
        onPointerDown={onHeadPointerDown}
        onPointerMove={onHeadPointerMove}
        onPointerUp={onHeadPointerUp}
        onPointerCancel={onHeadPointerUp}
      >
        <div className="dnp-brand">
          <span className="dnp-brand-mark">
            <IconSpark size={17} />
          </span>
          <span className="dnp-brand-copy">
            <span className="dnp-brand-title">语义星云</span>
            <span className="dnp-brand-sub">SEMANTIC NEBULA</span>
          </span>
        </div>
        <div className="dnp-badges">
          <span className="dnp-badge">VEC {settings.dims}</span>
          <span className="dnp-badge dnp-badge-pts">{points.length} PTS</span>
        </div>
        <div className="dnp-actions">
          <button
            type="button"
            className="dnp-icon"
            data-active={enabled}
            title={enabled ? '休眠可视化' : '启用输入语义可视化'}
            aria-label={enabled ? '休眠可视化' : '启用输入语义可视化'}
            onClick={() => face.setEnabled(!enabled)}
          >
            <IconPower size={15} />
          </button>
          <button
            type="button"
            className="dnp-icon"
            data-active={playing}
            disabled={current === undefined}
            title={playTitle}
            aria-label={playTitle}
            onClick={() => face.play()}
          >
            {playing ? <IconStop size={15} /> : <IconPlay size={15} />}
          </button>
          <button
            type="button"
            className="dnp-icon dnp-icon-text"
            title={`配色：${paletteName}（点击切换）`}
            aria-label={`配色：${paletteName}，点击切换`}
            onClick={() => face.setPalette((settings.palette + 1) % PALETTE_NAMES.length)}
          >
            <IconPalette size={15} />
            <span className="dnp-palette-name">{paletteName}</span>
          </button>
          <button
            type="button"
            className="dnp-icon"
            data-active={sheet}
            title="显示设置"
            aria-label="显示设置"
            onClick={() => setSheet((open) => !open)}
          >
            <IconSliders size={15} />
          </button>
          <button type="button" className="dnp-icon" title="收起为悬浮球" aria-label="收起为悬浮球" onClick={() => (onClose ?? face.hide)()}>
            <IconCollapse size={15} />
          </button>
        </div>
      </header>

      <div className="dnp-stage">
        <section className="dnp-view dnp-nebula">
          <NebulaCanvas face={face} point={current} settings={settings} playing={playing} />
          {!enabled && (
            <div className="dnp-overlay">
              <span className="dnp-overlay-icon">
                <IconMoon size={22} />
              </span>
              <strong>可视化已休眠</strong>
              <p>关闭后不再采集提交，也不会产生新的语义点。</p>
              <button type="button" className="dnp-cta" onClick={() => face.setEnabled(true)}>
                启用
              </button>
            </div>
          )}
          {enabled && points.length === 0 && (
            <div className="dnp-hint">
              <span className="dnp-hint-dot" />
              等待语义注入 · 发送第一条提示词
            </div>
          )}
        </section>

        <section className="dnp-view dnp-map">
          <MapCanvas
            face={face}
            points={points}
            currentId={snapshot.currentId}
            settings={settings}
            playing={playing}
          />
        </section>
      </div>

      <footer className="dnp-foot">
        <div className="dnp-now">
          {snapshot.answer !== undefined ? (
            <>
              <div className="dnp-now-text" title={snapshot.answer.text}>回答 · {snapshot.answer.text}</div>
              <div className="dnp-now-meta">
                {formatClock(snapshot.answer.time)}
                <span>·</span>
                回答 {snapshot.answer.text.length} 字符
              </div>
            </>
          ) : current !== undefined ? (
            <>
              <div className="dnp-now-text" title={current.text}>{current.text}</div>
              <div className="dnp-now-meta">
                {formatClock(current.time)}
                <span>·</span>
                {current.tokens} TOK
                <span>·</span>Σ {current.magnitude.toFixed(2)}
              </div>
            </>
          ) : (
            <div className="dnp-now-empty">
              <IconWave size={13} />
              尚无信号 · 发送提示词开始记录
            </div>
          )}
        </div>
        <div className="dnp-foot-side">
          <span className="dnp-mode" data-playing={playing}>
            {playing ? 'ROAM' : enabled ? 'SNAPSHOT' : 'SLEEP'}
          </span>
        </div>
      </footer>

      {sheet && (
        <>
          <div className="dnp-backdrop" onClick={() => setSheet(false)} />
          <div className="dnp-sheet" role="dialog" aria-label="语义星云显示设置">
            <div className="dnp-sheet-head">
              <span>显示设置</span>
              <button type="button" className="dnp-sheet-close" aria-label="关闭设置" onClick={() => setSheet(false)}>
                <IconChevron size={14} />
              </button>
            </div>

            <div className="dnp-row">
              <div>
                <div className="dnp-row-label">启用输入语义可视化</div>
                <div className="dnp-row-hint">总开关，关闭后插件休眠</div>
              </div>
              <Switch checked={enabled} onChange={(value) => face.setEnabled(value)} label="启用输入语义可视化" />
            </div>
            <div className="dnp-row">
              <div>
                <div className="dnp-row-label">提交后自动展开</div>
                <div className="dnp-row-hint">只在当前会话的提交上触发一次</div>
              </div>
              <Switch checked={settings.autoOpen} onChange={(value) => face.setAutoOpen(value)} label="提交后自动展开" />
            </div>
            <div className="dnp-row">
              <div>
                <div className="dnp-row-label">保存语义足迹</div>
                <div className="dnp-row-hint">写入本机 localStorage，仅本设备可见</div>
              </div>
              <Switch checked={settings.persist} onChange={(value) => face.setPersist(value)} label="保存语义足迹" />
            </div>

            <div className="dnp-group">
              <span className="dnp-group-label">嵌入维度</span>
              <div className="dnp-seg">
                <button type="button" data-on={settings.dims === 8192} onClick={() => face.setDims(8192)}>
                  8192 · 极致
                </button>
                <button type="button" data-on={settings.dims === 5120} onClick={() => face.setDims(5120)}>
                  5120 · 流畅
                </button>
              </div>
              <p className="dnp-note">几何始终按 8192 维计算；维度只改变粒子密度与细节，不改变星云形状。</p>
            </div>

            <div className="dnp-group">
              <span className="dnp-group-label">动效</span>
              <div className="dnp-seg">
                <button type="button" data-on={settings.motion === 'auto'} onClick={() => face.setMotion('auto')}>
                  跟随系统
                </button>
                <button type="button" data-on={settings.motion === 'full'} onClick={() => face.setMotion('full')}>
                  完整动效
                </button>
              </div>
              <p className="dnp-note">
                {settings.motion === 'full' ? (
                  '始终完整动效：自转、视差、尾迹与流星都会保留。'
                ) : systemReduced ? (
                  <>
                    系统开启了「减少动画」，星云只做极慢漂移。
                    <button type="button" className="dnp-note-action" onClick={() => face.setMotion('full')}>
                      改为完整动效
                    </button>
                  </>
                ) : (
                  '跟随系统的「减少动画」设置。'
                )}
              </p>
            </div>

            <div className="dnp-group">
              <span className="dnp-group-label">转速</span>
              <div className="dnp-seg" data-cols="3">
                <button type="button" data-on={settings.speed === 'low'} onClick={() => face.setSpeed('low')}>
                  低
                </button>
                <button type="button" data-on={settings.speed === 'mid'} onClick={() => face.setSpeed('mid')}>
                  中
                </button>
                <button type="button" data-on={settings.speed === 'high'} onClick={() => face.setSpeed('high')}>
                  高
                </button>
              </div>
              <p className="dnp-note">中速约 70 秒自转一圈，低速为一半，高速近两倍。只改转速，不改星云形状。</p>
            </div>

            <div className="dnp-group">
              <span className="dnp-group-label">配色</span>
              <div className="dnp-swatches">
                {PALETTE_NAMES.map((name, index) => (
                  <button
                    type="button"
                    key={name}
                    data-on={settings.palette === index}
                    onClick={() => face.setPalette(index)}
                  >
                    <i data-palette={index} />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="dnp-danger"
              data-confirm={confirmClear}
              disabled={points.length === 0}
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true)
                  return
                }
                face.clear()
                setConfirmClear(false)
              }}
            >
              {confirmClear ? '再次点击确认清空' : '清空本会话语义足迹'}
            </button>
            <p className="dnp-note dnp-note-foot">所有向量在本机由提示词确定性生成，不联网，也不读取消息以外的数据。</p>
          </div>
        </>
      )}
    </div>
  )
}

/** Compact chip title, with a live dot and the current footprint count. */

function IconWave({ size = 13 }: { size?: number }): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12h2.2l1.6-5.4 2.6 11 2.2-7.4 1.8 4.6 1.4-2.8H21" />
    </svg>
  )
}
