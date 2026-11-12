/** The floating card's whole visual language: warm ivory glass framing two deep-space canvases. */

const STYLE_ID = 'dsh-nebula-styles'

const CSS = `
.dnf-root {
  position: fixed;
  inset: 0;
  z-index: 60;
  pointer-events: none;
  color-scheme: light;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}
.dnf-root *,
.dnf-root *::before,
.dnf-root *::after { box-sizing: border-box; }
.dnf-root button { font: inherit; }

/* ------------------------------------------------------------- launcher */
.dnf-launcher-wrap {
  position: absolute;
  right: 18px;
  bottom: 18px;
  pointer-events: auto;
}
.dnf-launcher {
  position: relative;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.86);
  background:
    radial-gradient(120% 120% at 30% 12%, rgba(255, 255, 255, 0.98), transparent 58%),
    linear-gradient(150deg, rgba(253, 250, 245, 0.97), rgba(235, 230, 221, 0.93));
  box-shadow:
    0 12px 28px -10px rgba(20, 20, 38, 0.48),
    inset 0 1px 0 #fff,
    inset 0 -1px 0 rgba(90, 82, 100, 0.08);
  color: #5d4f92;
  color: color-mix(in oklab, var(--dnf-accent, #7b6cc4) 36%, #241c36);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
}
.dnf-launcher::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px solid rgba(112, 96, 210, 0.18);
  border-color: color-mix(in oklab, var(--dnf-accent, #7060d2) 30%, transparent);
  pointer-events: none;
}
.dnf-launcher:hover {
  transform: translateY(-1px) scale(1.03);
  color: color-mix(in oklab, var(--dnf-accent, #7b6cc4) 54%, #171021);
  box-shadow:
    0 16px 32px -12px rgba(20, 20, 38, 0.55),
    inset 0 1px 0 #fff;
}
/* A slow accent arc orbits the halo ring: CSS only, composited on the GPU. */
.dnf-launcher::before {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg 286deg,
    color-mix(in oklab, var(--dnf-accent, #7b6cc4) 72%, #fff) 342deg,
    transparent 360deg
  );
  -webkit-mask: radial-gradient(closest-side, transparent calc(100% - 3px), #000 calc(100% - 2.4px));
  mask: radial-gradient(closest-side, transparent calc(100% - 3px), #000 calc(100% - 2.4px));
  opacity: 0.85;
  animation: dnf-sheen 7.5s linear infinite;
  pointer-events: none;
}
.dnf-launcher:active { transform: translateY(0) scale(0.98); }
.dnf-launcher[data-off="true"] { color: #8d8798; }
.dnf-launcher-moon { font-size: 19px; line-height: 1; margin-top: -2px; }
.dnf-launcher-count {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 999px;
  background: linear-gradient(135deg, #6457e6, #2ea4bd);
  color: #fff;
  font: 7.5px/15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  text-align: center;
  box-shadow: 0 3px 8px -2px rgba(48, 40, 120, 0.5);
}

/* --------------------------------------------------------------- window */
.dnf-window {
  position: absolute;
  pointer-events: auto;
  border-radius: 20px;
  box-shadow:
    0 28px 72px -26px rgba(14, 16, 32, 0.58),
    0 8px 22px -12px rgba(14, 16, 32, 0.22),
    0 0 0 1px rgba(255, 255, 255, 0.38);
  animation: dnf-window-in 0.3s cubic-bezier(0.18, 0.9, 0.26, 1);
}
.dnf-grip {
  position: absolute;
  right: 2px;
  bottom: 2px;
  z-index: 12;
  width: 17px;
  height: 17px;
  cursor: nwse-resize;
  touch-action: none;
  border-bottom-right-radius: 18px;
  background:
    linear-gradient(135deg, transparent 46%, rgba(88, 82, 106, 0.38) 47%, transparent 51%),
    linear-gradient(135deg, transparent 62%, rgba(88, 82, 106, 0.24) 63%, transparent 68%);
}

.dnp {
  container: nebula / inline-size;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  border-radius: 20px;
  color: #2d3142;
  background:
    radial-gradient(120% 96% at 18% -6%, rgba(255, 255, 255, 0.98), transparent 56%),
    radial-gradient(90% 80% at 104% 6%, rgba(214, 232, 240, 0.55), transparent 60%),
    linear-gradient(158deg, rgba(252, 250, 246, 0.975) 0%, rgba(242, 239, 233, 0.955) 52%, rgba(233, 230, 224, 0.95) 100%);
  border: 1px solid rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(26px) saturate(1.18);
  -webkit-backdrop-filter: blur(26px) saturate(1.18);
}
/* A very fine paper grain keeps the warm surface from looking like flat plastic. */
.dnp::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  opacity: 0.055;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='150' height='150' filter='url(%23n)'/%3E%3C/svg%3E");
}
.dnp::after {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  z-index: 5;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.95) 18%, rgba(255, 255, 255, 0.95) 82%, transparent);
}

/* --------------------------------------------------------------- header */
.dnp-head {
  position: relative;
  z-index: 7;
  flex: 0 0 42px;
  height: 42px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 6px 0 11px;
  cursor: grab;
  user-select: none;
  touch-action: none;
  border-bottom: 1px solid rgba(48, 52, 70, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0.12));
}
.dnp-head[data-dragging="true"] { cursor: grabbing; }
.dnp-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 0 1 auto;
}
.dnp-brand-mark {
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: #fff;
  background: linear-gradient(145deg, #303a60 0%, #6b5ce0 56%, #2fa9bc 100%);
  box-shadow:
    0 4px 10px -3px rgba(58, 52, 132, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.42);
}
.dnp-brand-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.02;
}
.dnp-brand-title {
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.055em;
  color: #242a3c;
  white-space: nowrap;
}
.dnp-brand-sub {
  margin-top: 3px;
  font: 6.8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.19em;
  color: #918c9d;
  white-space: nowrap;
}
.dnp-badges {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex: 0 0 auto;
}
.dnp-badge {
  padding: 3px 5px;
  border-radius: 5px;
  border: 1px solid rgba(45, 49, 68, 0.06);
  background: rgba(45, 49, 68, 0.05);
  color: #767182;
  font: 7.5px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.045em;
  white-space: nowrap;
}
.dnp-badge-pts { color: #5c547e; }
.dnp-actions {
  display: flex;
  align-items: center;
  gap: 1px;
  flex: 0 0 auto;
}
.dnp-icon {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: transparent;
  color: #5f5b6e;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}
.dnp-icon:hover:not(:disabled) { background: rgba(45, 49, 68, 0.075); color: #2b3042; }
.dnp-icon[data-active="true"] {
  color: #4a3dba;
  background: linear-gradient(145deg, rgba(95, 84, 220, 0.15), rgba(45, 170, 190, 0.13));
  box-shadow: inset 0 0 0 1px rgba(88, 80, 200, 0.15);
}
.dnp-icon:disabled { opacity: 0.3; cursor: default; }
.dnp-icon-text { width: auto; padding: 0 6px; gap: 4px; display: inline-flex; }
.dnp-palette-name {
  font-size: 8.5px;
  letter-spacing: 0.03em;
  color: #6d687e;
  white-space: nowrap;
}

/* ---------------------------------------------------------------- stage */
.dnp-stage {
  position: relative;
  z-index: 2;
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.34fr) minmax(0, 1fr);
  gap: 7px;
  padding: 8px 8px 7px;
}
.dnp-view {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(10, 14, 26, 0.92);
  background: #05070f;
  box-shadow:
    0 8px 22px -12px rgba(18, 18, 36, 0.55),
    inset 0 0 0 1px rgba(255, 255, 255, 0.045);
}
.dnp-canvas-host { position: absolute; inset: 0; }
.dnp-canvas { display: block; width: 100%; height: 100%; }

.dnp-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 14px;
  text-align: center;
  color: #e8efff;
  background: radial-gradient(circle at 50% 38%, rgba(12, 16, 30, 0.58), rgba(4, 6, 12, 0.92));
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}
.dnp-overlay-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #cfdbff;
  border: 1px solid rgba(150, 180, 255, 0.22);
  background: rgba(120, 150, 220, 0.08);
}
.dnp-overlay strong { font-size: 11.5px; font-weight: 600; letter-spacing: 0.02em; }
.dnp-overlay p {
  max-width: 230px;
  margin: 0;
  font-size: 8.8px;
  line-height: 1.55;
  color: rgba(206, 219, 246, 0.66);
}
.dnp-cta {
  margin-top: 4px;
  padding: 4px 13px;
  border-radius: 6px;
  border: 1px solid rgba(140, 190, 255, 0.34);
  background: rgba(80, 140, 230, 0.16);
  color: #dceaff;
  font-size: 9px;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease;
}
.dnp-cta:hover { background: rgba(90, 160, 250, 0.24); border-color: rgba(160, 205, 255, 0.48); }
.dnp-hint {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 25px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 8.3px;
  letter-spacing: 0.02em;
  color: rgba(190, 210, 240, 0.56);
  pointer-events: none;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}
.dnp-hint-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #6de3e0;
  box-shadow: 0 0 7px #6de3e0;
  animation: dnp-pulse 2.6s ease-in-out infinite;
}

/* --------------------------------------------------------------- footer */
.dnp-foot {
  position: relative;
  z-index: 7;
  flex: 0 0 auto;
  min-height: 33px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 5px;
  border-top: 1px solid rgba(48, 52, 70, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.42));
}
.dnp-now {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dnp-now-text {
  overflow: hidden;
  color: #3a3e50;
  font-size: 9.4px;
  line-height: 1.22;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.dnp-now-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8d8899;
  font: 7.6px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.03em;
  white-space: nowrap;
}
.dnp-now-meta span { opacity: 0.55; }
.dnp-now-empty {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #8f8a9b;
  font-size: 8.8px;
}
.dnp-foot-side { flex: 0 0 auto; display: flex; align-items: center; }
.dnp-mode {
  padding: 3px 5px;
  border-radius: 4px;
  border: 1px solid rgba(45, 49, 68, 0.07);
  background: rgba(45, 49, 68, 0.055);
  color: #827d90;
  font: 7.2px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing: 0.12em;
}
.dnp-mode[data-playing="true"] {
  color: #4a3dba;
  border-color: rgba(95, 84, 220, 0.18);
  background: rgba(95, 84, 220, 0.1);
}

/* ------------------------------------------------------------- settings */
.dnp-backdrop {
  position: absolute;
  inset: 0;
  z-index: 8;
  border-radius: inherit;
  background: rgba(18, 20, 32, 0.16);
  backdrop-filter: blur(1.4px);
  -webkit-backdrop-filter: blur(1.4px);
}
.dnp-sheet {
  position: absolute;
  top: 46px;
  right: 7px;
  z-index: 9;
  width: min(300px, calc(100% - 14px));
  max-height: calc(100% - 54px);
  overflow: auto;
  padding: 11px 12px 12px;
  border-radius: 14px;
  color: #2e3244;
  border: 1px solid rgba(255, 255, 255, 0.92);
  background:
    radial-gradient(120% 90% at 20% 0%, rgba(255, 255, 255, 1), transparent 58%),
    linear-gradient(165deg, rgba(253, 251, 247, 0.99), rgba(241, 238, 231, 0.99));
  box-shadow:
    0 22px 52px -18px rgba(20, 20, 38, 0.58),
    inset 0 1px 0 #fff;
  scrollbar-width: thin;
  animation: dnf-sheet-in 0.18s ease;
}
.dnp-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.08em;
}
.dnp-sheet-close {
  width: 22px;
  height: 22px;
  padding: 0;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #7c7788;
  cursor: pointer;
}
.dnp-sheet-close:hover { background: rgba(45, 49, 68, 0.07); color: #2e3244; }
.dnp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(45, 49, 68, 0.06);
}
.dnp-row:last-of-type { border-bottom: 0; }
.dnp-row-label { font-size: 9.4px; font-weight: 550; color: #383c4e; }
.dnp-row-hint { margin-top: 2px; font-size: 7.8px; line-height: 1.4; color: #938e9f; }
.dnp-switch {
  position: relative;
  flex: 0 0 30px;
  width: 30px;
  height: 17px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid rgba(45, 49, 68, 0.12);
  background: rgba(45, 49, 68, 0.09);
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}
.dnp-switch[data-on="true"] {
  border-color: transparent;
  background: linear-gradient(135deg, #5d55d9, #2fa9bc);
}
.dnp-switch-knob {
  position: absolute;
  top: 1.5px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(20, 22, 40, 0.28);
  transition: transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1);
}
.dnp-switch[data-on="true"] .dnp-switch-knob { transform: translateX(13px); }
.dnp-group { margin-top: 10px; }
.dnp-group-label {
  display: block;
  margin-bottom: 5px;
  color: #8d8899;
  font-size: 7.6px;
  font-weight: 600;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.dnp-seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  padding: 3px;
  border-radius: 8px;
  background: rgba(45, 49, 68, 0.06);
}
.dnp-seg button {
  padding: 5px 4px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #777284;
  font-size: 8.4px;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease;
}
.dnp-seg button[data-on="true"] {
  color: #2f3345;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.93);
  box-shadow: 0 1px 3px rgba(30, 32, 50, 0.13);
}
.dnp-note {
  margin: 5px 0 0;
  color: #9893a3;
  font-size: 7.7px;
  line-height: 1.55;
}
.dnp-note-foot {
  margin-top: 9px;
  padding-top: 8px;
  border-top: 1px solid rgba(45, 49, 68, 0.06);
  text-align: center;
}
.dnp-swatches {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}
.dnp-swatches button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 5px 3px;
  border-radius: 8px;
  border: 1px solid rgba(45, 49, 68, 0.08);
  background: rgba(255, 255, 255, 0.46);
  color: #6b6677;
  font-size: 8px;
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, color 0.16s ease;
}
.dnp-swatches button[data-on="true"] {
  color: #3b3262;
  border-color: rgba(95, 84, 220, 0.4);
  box-shadow: 0 0 0 1px rgba(95, 84, 220, 0.1);
}
.dnp-swatches i {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35), 0 2px 5px -2px rgba(30, 28, 60, 0.4);
}
.dnp-swatches i[data-palette="0"] { background: conic-gradient(from 210deg, #63f3ff, #7a6bff, #ff6ad5, #63f3ff); }
.dnp-swatches i[data-palette="1"] { background: conic-gradient(from 210deg, #83ffc8, #5ef2ff, #8a5cff, #83ffc8); }
.dnp-swatches i[data-palette="2"] { background: conic-gradient(from 210deg, #ffc06b, #ff7a63, #ff6ad5, #ffc06b); }
.dnp-danger {
  width: 100%;
  margin-top: 10px;
  padding: 6px;
  border-radius: 7px;
  border: 1px solid rgba(180, 70, 95, 0.16);
  background: rgba(190, 80, 105, 0.06);
  color: #a35466;
  font-size: 8.6px;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
}
.dnp-danger:hover:not(:disabled) {
  border-color: rgba(180, 70, 95, 0.3);
  background: rgba(190, 80, 105, 0.1);
  color: #8d3c51;
}
.dnp-danger[data-confirm="true"] {
  border-color: rgba(180, 70, 95, 0.4);
  background: rgba(190, 70, 95, 0.14);
  color: #8a2f45;
}
.dnp-danger:disabled { opacity: 0.38; cursor: default; }

/* ----------------------------------------------------------- responsive */
@container nebula (max-width: 475px) {
  .dnp-brand-sub { display: none; }
  .dnp-badges { display: none; }
  .dnp-icon-text { width: 24px; padding: 0; }
  .dnp-palette-name { display: none; }
}
@container nebula (max-width: 435px) {
  .dnp-brand-title { font-size: 11px; }
  .dnp-stage { grid-template-columns: 1.2fr 1fr; gap: 5px; padding: 6px; }
  .dnp-foot { padding-left: 8px; padding-right: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .dnf-window, .dnp-sheet { animation: none; }
  .dnp-hint-dot { animation: none; }
  .dnf-launcher { transition: none; }
  .dnf-launcher::before { animation: none; opacity: 0.26; }
}

/* ----------------------------------------------------------- animations */
@keyframes dnf-window-in {
  from { opacity: 0; transform: translateY(9px) scale(0.986); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dnf-sheet-in {
  from { opacity: 0; transform: translateY(-5px) scale(0.99); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dnp-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.15); }
}
@keyframes dnf-sheen {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`

/** Inject the stylesheet once; repeated plugin activation is harmless. */
export function installStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (document.getElementById(STYLE_ID) !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
  return () => {
    style.remove()
  }
}
