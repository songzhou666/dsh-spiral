window.__ModuleLoader__.load({ id: "dsh-spiral", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react5 = require("react");
var import_client = require("react-dom/client");

// src/client/engine.ts
var PROFILE_BANDS = 256;
var FAMILIES = [
  {
    id: "cryo",
    name: "CRYO",
    arms: ["#63f3ff", "#3f86ff", "#a879ff", "#e9fdff"],
    core: "#f2feff",
    ambient: "rgba(48, 150, 255, 0.20)"
  },
  {
    id: "iris",
    name: "IRIS",
    arms: ["#9a78ff", "#5f6bff", "#ff6ad5", "#efe6ff"],
    core: "#f8f2ff",
    ambient: "rgba(120, 90, 255, 0.22)"
  },
  {
    id: "rose",
    name: "ROSE",
    arms: ["#ff6ad5", "#ff8aa8", "#ffd37a", "#fff0f8"],
    core: "#fff4fa",
    ambient: "rgba(255, 90, 180, 0.18)"
  },
  {
    id: "aurora",
    name: "AURORA",
    arms: ["#83ffc8", "#5ef2ff", "#7f86ff", "#e6fff8"],
    core: "#f0fffb",
    ambient: "rgba(70, 255, 190, 0.16)"
  },
  {
    id: "ember",
    name: "EMBER",
    arms: ["#ffc06b", "#ff7a63", "#ff6ad5", "#fff0d8"],
    core: "#fff7ea",
    ambient: "rgba(255, 150, 80, 0.18)"
  },
  {
    id: "abyss",
    name: "ABYSS",
    arms: ["#3f9bff", "#5ef2ff", "#8a5cff", "#d8ecff"],
    core: "#eef9ff",
    ambient: "rgba(40, 120, 255, 0.20)"
  }
];
var PALETTE_FAMILIES = [
  [0, 5, 1, 2],
  [3, 0, 1, 5],
  [4, 2, 1, 0]
];
var PALETTE_NAMES = ["\u6DF1\u7A7A", "\u6781\u5149", "\u65E5\u5195"];
function schemeOf(base, palette) {
  const families = PALETTE_FAMILIES[palette % PALETTE_FAMILIES.length] ?? PALETTE_FAMILIES[0];
  const index = families[(base % families.length + families.length) % families.length] ?? 0;
  const family = FAMILIES[index] ?? FAMILIES[0];
  return {
    id: family.id,
    name: family.name,
    arms: family.arms,
    dust: [family.arms[1], family.arms[2], family.arms[3]],
    core: family.core,
    accent: family.arms[0],
    ambient: family.ambient
  };
}
var N = 8192;
var FFT_SIZE = N;
var KERNEL_SIGMA = 4.6;
var MAX_FEATURES = 640;
var SPARSE_GAIN = 0.075;
var MAP_BASIS_SEED = 1584077437;
function hashString(text, seed = 2166136261) {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2146121005);
  h ^= h >>> 15;
  h = Math.imul(h, 2221713035);
  h ^= h >>> 16;
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function fft(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (inverse ? 2 : -2) * Math.PI / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const vRe = re[b] * curRe - im[b] * curIm;
        const vIm = re[b] * curIm + im[b] * curRe;
        const uRe = re[a];
        const uIm = im[a];
        re[a] = uRe + vRe;
        im[a] = uIm + vIm;
        re[b] = uRe - vRe;
        im[b] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] = re[i] / n;
      im[i] = im[i] / n;
    }
  }
}
var kernelSpectrum;
function spectrumOfKernel() {
  if (kernelSpectrum !== void 0) return kernelSpectrum;
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const denom = 2 * KERNEL_SIGMA * KERNEL_SIGMA;
  for (let i = 0; i < FFT_SIZE; i++) {
    const d = Math.min(i, FFT_SIZE - i);
    re[i] = Math.exp(-(d * d) / denom);
  }
  fft(re, im, false);
  kernelSpectrum = { re, im };
  return kernelSpectrum;
}
function collectFeatures(text) {
  const normalized = text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return [{ key: "empty", weight: 1 }];
  const entries = /* @__PURE__ */ new Map();
  const add = (key, weight) => {
    const entry = entries.get(key);
    if (entry === void 0) entries.set(key, { count: 1, weight });
    else {
      entry.count += 1;
      if (weight > entry.weight) entry.weight = weight;
    }
  };
  for (const match of normalized.matchAll(/[a-z0-9][a-z0-9_'-]*/g)) {
    const word = match[0];
    add(`w:${word}`, 1.35);
    if (word.length > 3) {
      for (let i = 0; i + 3 <= word.length; i++) add(`t:${word.slice(i, i + 3)}`, 0.42);
    }
    if (word.length > 6) add(`p:${word.slice(0, 3)}:${word.slice(-3)}`, 0.3);
  }
  const cjk = [...normalized].filter((ch) => new RegExp("\\p{Script=Han}", "u").test(ch));
  for (let i = 0; i < cjk.length; i++) {
    const ch = cjk[i];
    add(`c:${ch}`, 1.05);
    if (i + 1 < cjk.length) add(`b:${ch}${cjk[i + 1]}`, 1.65);
    if (i + 2 < cjk.length) {
      add(`g:${ch}${cjk[i + 1]}${cjk[i + 2]}`, 0.72);
      add(`s:${ch}${cjk[i + 2]}`, 0.32);
    }
  }
  add(`x:${normalized.slice(0, 48)}`, 0.38);
  add(`y:${normalized.slice(-32)}`, 0.26);
  const features = [];
  for (const [key, entry] of entries) {
    const weight = entry.weight * (1 + Math.log1p(entry.count - 1) * 0.55);
    features.push({ key, weight });
  }
  features.sort((a, b) => b.weight - a.weight || (a.key < b.key ? -1 : 1));
  return features.slice(0, MAX_FEATURES);
}
function embed(text, dims) {
  const features = collectFeatures(text);
  const spectrum = spectrumOfKernel();
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const sparse = new Float32Array(FFT_SIZE);
  for (const feature of features) {
    const h = hashString(feature.key);
    const spikes = 7;
    for (let k = 0; k < spikes; k++) {
      const idx = h + Math.imul(k, 2654435761) & FFT_SIZE - 1;
      const sign = h >>> k * 3 & 1 ? 1 : -1;
      const w = feature.weight / (1 + k * 0.36);
      sparse[idx] = sparse[idx] + sign * w;
      re[idx] = re[idx] + sign * w;
    }
  }
  fft(re, im, false);
  for (let i = 0; i < FFT_SIZE; i++) {
    const a = re[i];
    const b = im[i];
    re[i] = a * spectrum.re[i] - b * spectrum.im[i];
    im[i] = a * spectrum.im[i] + b * spectrum.re[i];
  }
  fft(re, im, true);
  const vector = new Float32Array(FFT_SIZE);
  let energy = 0;
  for (let i = 0; i < FFT_SIZE; i++) {
    const v = re[i] + sparse[i] * SPARSE_GAIN;
    vector[i] = v;
    energy += v * v;
  }
  const rms = Math.sqrt(energy / FFT_SIZE);
  const phase = hashString(text, 798628925) / 4294967296 * Math.PI * 2;
  const tilt = 0.34 * rms;
  for (let i = 0; i < FFT_SIZE; i++) {
    vector[i] = vector[i] + tilt * Math.sin(i / FFT_SIZE * Math.PI * 6 + phase);
  }
  let sum = 0;
  for (let i = 0; i < FFT_SIZE; i++) sum += vector[i] * vector[i];
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < FFT_SIZE; i++) vector[i] = vector[i] / norm;
  return dims === 8192 ? vector : vector.slice(0, dims);
}
var mapBasis;
function basisOf() {
  if (mapBasis !== void 0) return mapBasis;
  const rng = mulberry32(MAP_BASIS_SEED);
  const make = () => {
    const raw = new Float32Array(PROFILE_BANDS);
    let mean = 0;
    for (let i = 0; i < PROFILE_BANDS; i++) {
      raw[i] = rng() < 0.5 ? -1 : 1;
      mean += raw[i];
    }
    mean /= PROFILE_BANDS;
    let norm = 0;
    for (let i = 0; i < PROFILE_BANDS; i++) {
      raw[i] = raw[i] - mean;
      norm += raw[i] * raw[i];
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < PROFILE_BANDS; i++) raw[i] = raw[i] / norm;
    return raw;
  };
  mapBasis = [make(), make(), make()];
  return mapBasis;
}
function profileOf(vector) {
  const dims = vector.length;
  const profile = new Float32Array(PROFILE_BANDS);
  const signed = new Float32Array(PROFILE_BANDS);
  const counts = new Uint32Array(PROFILE_BANDS);
  const sums = new Float64Array(PROFILE_BANDS);
  const squares = new Float64Array(PROFILE_BANDS);
  for (let i = 0; i < dims; i++) {
    const band = Math.floor(i * PROFILE_BANDS / dims);
    const v = vector[i];
    sums[band] = sums[band] + v;
    squares[band] = squares[band] + v * v;
    counts[band] = counts[band] + 1;
  }
  let maxEnergy = 0;
  let maxAbs = 0;
  for (let b = 0; b < PROFILE_BANDS; b++) {
    const count = counts[b] || 1;
    const mean = sums[b] / count;
    const rms = Math.sqrt(squares[b] / count);
    signed[b] = mean;
    profile[b] = rms;
    const abs = Math.abs(mean);
    if (abs > maxAbs) maxAbs = abs;
    if (rms > maxEnergy) maxEnergy = rms;
  }
  const energyMax = maxEnergy || 1;
  for (let b = 0; b < PROFILE_BANDS; b++) {
    profile[b] = Math.pow(profile[b] / energyMax, 0.72);
  }
  const smooth = new Float32Array(PROFILE_BANDS);
  for (let b = 0; b < PROFILE_BANDS; b++) {
    const a = profile[(b + PROFILE_BANDS - 1) % PROFILE_BANDS];
    const c = profile[(b + 1) % PROFILE_BANDS];
    smooth[b] = a * 0.22 + profile[b] * 0.56 + c * 0.22;
  }
  let smoothMax = 0;
  for (let b = 0; b < PROFILE_BANDS; b++) if (smooth[b] > smoothMax) smoothMax = smooth[b];
  if (smoothMax > 0) {
    for (let b = 0; b < PROFILE_BANDS; b++) smooth[b] = smooth[b] / smoothMax;
  }
  const signedNorm = maxAbs || 1;
  for (let b = 0; b < PROFILE_BANDS; b++) signed[b] = signed[b] / signedNorm;
  return { profile: smooth, signed };
}
function tokenizePrompt(text) {
  const tokens = [];
  const re = /[\p{Script=Han}]|[A-Za-z0-9][A-Za-z0-9_'-]*|[^\s]/gu;
  for (const match of text.normalize("NFKC").matchAll(re)) {
    tokens.push(match[0]);
    if (tokens.length >= 48) break;
  }
  return tokens;
}
function windowText(tokens, index, radius = 2) {
  const start = Math.max(0, index - radius);
  const end = Math.min(tokens.length, index + radius + 1);
  return tokens.slice(start, end).join(" ");
}
function analyze(text, _dims = 8192) {
  const vector = embed(text, 8192);
  const { profile, signed } = profileOf(vector);
  const raw = basisOf().map((basis) => {
    let dot = 0;
    for (let i = 0; i < PROFILE_BANDS; i++) dot += signed[i] * basis[i];
    return dot;
  });
  let projNorm = Math.hypot(raw[0], raw[1], raw[2]);
  if (projNorm < 1e-6) {
    const rng = mulberry32(hashString(text, 439041101));
    raw[0] = rng() * 2 - 1;
    raw[1] = rng() * 2 - 1;
    raw[2] = rng() * 2 - 1;
    projNorm = Math.hypot(raw[0], raw[1], raw[2]) || 1;
  }
  const axis = [raw[0] / projNorm, raw[1] / projNorm, raw[2] / projNorm];
  const tokens = tokenizePrompt(text).length;
  const schemeBase = hashString(text, 2084540853) % FAMILIES.length;
  const magnitude = Math.max(0.35, Math.min(1, 0.35 + projNorm * 1.25));
  return {
    profile,
    signed,
    axis,
    mapX: Math.max(-1, Math.min(1, axis[0] * 1.18)),
    mapY: Math.max(-1, Math.min(1, axis[1] * 1.18)),
    schemeBase,
    magnitude,
    tokens
  };
}
function sequenceOf(text, dims = 8192) {
  const tokens = tokenizePrompt(text);
  if (tokens.length <= 1) {
    const only = analyze(text, dims);
    return [{ ...only, label: text.trim().slice(0, 12), index: 0 }];
  }
  const meaningful = [];
  for (let i = 0; i < tokens.length; i++) {
    if (/[\p{Script=Han}A-Za-z0-9]/u.test(tokens[i])) meaningful.push(i);
  }
  const source = meaningful.length > 1 ? meaningful : tokens.map((_, i) => i);
  const maxFrames = 28;
  const indices = [];
  if (source.length <= maxFrames) {
    for (const i of source) indices.push(i);
  } else {
    for (let k = 0; k < maxFrames; k++) {
      indices.push(source[Math.round(k * (source.length - 1) / (maxFrames - 1))]);
    }
  }
  return indices.map((tokenIndex, index) => {
    const label = tokens[tokenIndex] ?? "";
    const frame = analyze(windowText(tokens, tokenIndex), dims);
    return { ...frame, label, index };
  });
}

// src/client/store.ts
var MAX_POINTS = 72;
var FRAME_MS = 220;
var DEDUPE_WINDOW_MS = 15e3;
var SETTINGS_KEY = "dsh-nebula:settings:v1";
var HISTORY_PREFIX = "dsh-nebula:history:v1:";
var DEFAULT_SETTINGS = {
  enabled: true,
  autoOpen: true,
  dims: 8192,
  palette: 0,
  persist: true
};
function encodeBytes(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function decodeBytes(text) {
  const binary = atob(text);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
function encodeProfile(profile) {
  const out = new Uint8Array(profile.length);
  for (let i = 0; i < profile.length; i++) {
    out[i] = Math.max(0, Math.min(255, Math.round(profile[i] * 255)));
  }
  return out;
}
function encodeSigned(profile) {
  const out = new Uint8Array(profile.length);
  for (let i = 0; i < profile.length; i++) {
    out[i] = Math.max(0, Math.min(255, Math.round((profile[i] * 0.5 + 0.5) * 255)));
  }
  return out;
}
function decodeProfile(bytes) {
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] / 255;
  return out;
}
function decodeSigned(bytes) {
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] / 255 * 2 - 1;
  return out;
}
function storageAvailable() {
  try {
    const probe = "__dsh_nebula_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
function storedToPoint(stored) {
  if (typeof stored?.id !== "string" || typeof stored.text !== "string") return void 0;
  const text = stored.text.slice(0, 4e3);
  try {
    const profile = stored.profile ? decodeBytes(stored.profile) : new Uint8Array();
    const signed = stored.signed ? decodeBytes(stored.signed) : new Uint8Array();
    if (profile.length === PROFILE_BANDS) {
      const axis = [
        Number(stored.axis?.[0]) || 0,
        Number(stored.axis?.[1]) || 0,
        Number(stored.axis?.[2]) || 0
      ];
      return {
        id: stored.id,
        text,
        time: Number(stored.time) || Date.now(),
        capturedAt: Number(stored.capturedAt) || Number(stored.time) || Date.now(),
        profile: decodeProfile(profile),
        signed: signed.length === PROFILE_BANDS ? decodeSigned(signed) : new Float32Array(PROFILE_BANDS),
        axis,
        mapX: Number(stored.mapX) || 0,
        mapY: Number(stored.mapY) || 0,
        schemeBase: Math.abs(Math.trunc(Number(stored.schemeBase) || 0)) % 6,
        magnitude: Math.min(1, Math.max(0.3, Number(stored.magnitude) || 0.7)),
        tokens: Math.max(0, Math.trunc(Number(stored.tokens) || 0))
      };
    }
  } catch {
  }
  const derived = analyze(text);
  return {
    id: stored.id,
    text,
    time: Number(stored.time) || Date.now(),
    capturedAt: Number(stored.capturedAt) || Number(stored.time) || Date.now(),
    profile: derived.profile,
    signed: derived.signed,
    axis: derived.axis,
    mapX: derived.mapX,
    mapY: derived.mapY,
    schemeBase: derived.schemeBase,
    magnitude: derived.magnitude,
    tokens: derived.tokens
  };
}
function loadPoints(sessionId) {
  if (!storageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(`${HISTORY_PREFIX}${sessionId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.points)) return [];
    const points = [];
    for (const item of parsed.points) {
      const point = storedToPoint(item);
      if (point !== void 0) points.push(point);
    }
    return points.slice(-MAX_POINTS);
  } catch {
    return [];
  }
}
function persistPoints(sessionId, points) {
  if (!storageAvailable()) return;
  try {
    const key = `${HISTORY_PREFIX}${sessionId}`;
    if (points.length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    const payload = {
      v: 1,
      points: points.slice(-MAX_POINTS).map((point) => ({
        id: point.id,
        text: point.text.slice(0, 4e3),
        time: point.time,
        capturedAt: point.capturedAt,
        profile: encodeBytes(encodeProfile(point.profile)),
        signed: encodeBytes(encodeSigned(point.signed)),
        axis: [point.axis[0], point.axis[1], point.axis[2]],
        mapX: point.mapX,
        mapY: point.mapY,
        schemeBase: point.schemeBase,
        magnitude: point.magnitude,
        tokens: point.tokens
      }))
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
  }
}
function loadSettings() {
  if (!storageAvailable()) return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      autoOpen: typeof parsed.autoOpen === "boolean" ? parsed.autoOpen : DEFAULT_SETTINGS.autoOpen,
      dims: parsed.dims === 5120 ? 5120 : 8192,
      palette: [0, 1, 2].includes(Number(parsed.palette)) ? Number(parsed.palette) : 0,
      persist: typeof parsed.persist === "boolean" ? parsed.persist : DEFAULT_SETTINGS.persist
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
function saveSettings(settings) {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
  }
}
function clearAllHistory() {
  if (!storageAvailable()) return;
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key !== null && key.startsWith(HISTORY_PREFIX)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
  }
}
function formatClock(ms) {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "--:--";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
var SessionStore = class {
  constructor(sessionId, host) {
    this.sessionId = sessionId;
    this.host = host;
    this.points = this.host.settings().persist ? loadPoints(sessionId) : [];
    this.currentId = this.points.at(-1)?.id;
    this.snapshot = this.build();
  }
  points;
  currentId;
  playing = false;
  answer;
  sequence;
  sequenceStart = 0;
  timer;
  persistTimer;
  listeners = /* @__PURE__ */ new Set();
  snapshot;
  revision = 0;
  /* ---------------------------------------------------------------- face */
  getSnapshot = () => this.snapshot;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  open = () => this.host.requestOpen(this.sessionId);
  hide = () => this.host.requestHide();
  play = () => this.playSequence();
  stop = () => this.stopSequence(true);
  select = (id) => this.selectPoint(id);
  clear = () => this.clearPoints();
  setEnabled = (value) => this.host.setEnabled(value);
  setAutoOpen = (value) => this.host.setAutoOpen(value);
  setDims = (dims) => this.host.setDims(dims);
  setPalette = (palette) => this.host.setPalette(palette);
  setPersist = (value) => this.host.setPersist(value);
  /** Record the latest completed answer; only the optional roam uses it. */
  setAnswer(text, time) {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (normalized.length === 0) return;
    if (this.answer?.text === normalized && this.answer.time === time) return;
    this.answer = { text: normalized.slice(0, 12e3), time };
    this.emit();
  }
  /* ------------------------------------------------------------- actions */
  build() {
    return {
      sessionId: this.sessionId,
      points: this.points,
      currentId: this.currentId,
      settings: this.host.settings(),
      playing: this.playing,
      answer: this.answer,
      revision: this.revision
    };
  }
  emit() {
    this.revision += 1;
    this.snapshot = this.build();
    for (const listener of this.listeners) listener();
    this.schedulePersist();
  }
  hasId(id) {
    return this.points.some((point) => point.id === id);
  }
  hasRecentText(text, windowMs = DEDUPE_WINDOW_MS) {
    const now = Date.now();
    const normalized = text.replace(/\s+/g, " ").trim();
    return this.points.some(
      (point) => point.text.replace(/\s+/g, " ").trim() === normalized && Math.abs(now - point.capturedAt) < windowMs
    );
  }
  add(point) {
    if (this.hasId(point.id)) return false;
    if (this.points.length >= MAX_POINTS) this.points = this.points.slice(-(MAX_POINTS - 1));
    this.points = [...this.points, point];
    this.currentId = point.id;
    this.answer = void 0;
    this.stopSequence(false);
    this.emit();
    return true;
  }
  selectPoint(id) {
    if (!this.points.some((point) => point.id === id)) return;
    this.stopSequence(false);
    this.currentId = id;
    this.answer = void 0;
    this.emit();
  }
  clearPoints() {
    this.stopSequence(false);
    this.points = [];
    this.currentId = void 0;
    this.answer = void 0;
    this.emit();
    if (this.host.settings().persist) persistPoints(this.sessionId, []);
  }
  current() {
    return this.points.find((point) => point.id === this.currentId) ?? this.points.at(-1);
  }
  /* ------------------------------------------------------------- roaming */
  playSequence() {
    if (this.playing) {
      this.stopSequence(true);
      return;
    }
    const current = this.current();
    if (current === void 0) return;
    const source = this.answer?.text ?? current.text;
    if (source.trim().length === 0) return;
    this.sequence = sequenceOf(source, this.host.settings().dims);
    this.sequenceStart = performance.now() + 140;
    this.playing = true;
    this.emit();
    const total = 140 + this.sequence.length * FRAME_MS + 180;
    this.timer = window.setTimeout(() => {
      this.timer = void 0;
      this.playing = false;
      this.sequence = void 0;
      this.emit();
    }, total);
  }
  stopSequence(notify) {
    if (this.timer !== void 0) {
      window.clearTimeout(this.timer);
      this.timer = void 0;
    }
    if (!this.playing && this.sequence === void 0) return;
    this.playing = false;
    this.sequence = void 0;
    if (notify) this.emit();
  }
  /** Cancel playback without emitting; the caller owns the next snapshot. */
  cancelPlayback() {
    this.stopSequence(false);
  }
  sequenceAt = (now) => {
    const sequence = this.sequence;
    if (!this.playing || sequence === void 0 || sequence.length === 0) return void 0;
    const elapsed = now - this.sequenceStart;
    if (elapsed <= 0) {
      const first = sequence[0];
      return { a: first, b: first, mix: 0, index: 0, label: first.label };
    }
    const position = elapsed / FRAME_MS;
    const index = Math.min(sequence.length - 1, Math.floor(position));
    const a = sequence[index];
    if (index >= sequence.length - 1) {
      return { a, b: a, mix: 0, index, label: a.label };
    }
    const b = sequence[index + 1];
    const mix = Math.min(1, Math.max(0, position - index));
    return { a, b, mix, index, label: mix < 0.5 ? a.label : b.label };
  };
  /* ------------------------------------------------------------- settings */
  onSettingsChanged(previous) {
    const settings = this.host.settings();
    if (settings.dims !== previous.dims) this.cancelPlayback();
    if (!settings.enabled) this.cancelPlayback();
    if (previous.persist && !settings.persist) persistPoints(this.sessionId, []);
    this.emit();
  }
  /* ------------------------------------------------------------ lifecycle */
  schedulePersist() {
    if (this.persistTimer !== void 0) return;
    this.persistTimer = window.setTimeout(() => {
      this.persistTimer = void 0;
      if (!this.host.settings().persist) return;
      persistPoints(this.sessionId, this.points);
    }, 320);
  }
  dispose() {
    if (this.timer !== void 0) window.clearTimeout(this.timer);
    if (this.persistTimer !== void 0) {
      window.clearTimeout(this.persistTimer);
      this.persistTimer = void 0;
      if (this.host.settings().persist) persistPoints(this.sessionId, this.points);
    }
    this.listeners.clear();
  }
};

// src/client/controller.ts
function normalizeText(text) {
  return text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}
function textOfContent(content) {
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const block of content) {
    if (block !== null && typeof block === "object" && block.type === "text") {
      const text = block.text;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts.join("\n");
}
var NebulaController = class {
  constructor(ctx) {
    this.ctx = ctx;
    this.settingsValue = loadSettings();
    this.mountDispose = this.ctx.sidebarRight.mounted.subscribe(() => this.syncMounted());
    this.syncMounted();
  }
  settingsValue;
  stores = /* @__PURE__ */ new Map();
  attached;
  lastSeq = /* @__PURE__ */ new Map();
  lastAnswerSeq = /* @__PURE__ */ new Map();
  pendingTexts = [];
  mountDispose;
  retryTimer;
  attachAttempts = 0;
  lastMounted;
  visible = false;
  visibleListeners = /* @__PURE__ */ new Set();
  activeListeners = /* @__PURE__ */ new Set();
  /* --------------------------------------------------------------- host API */
  settings() {
    return this.settingsValue;
  }
  activeSession = () => this.ctx.sidebarRight.mounted.getSnapshot();
  subscribeActive = (listener) => {
    this.activeListeners.add(listener);
    return () => {
      this.activeListeners.delete(listener);
    };
  };
  isVisible = () => this.visible;
  subscribeVisible = (listener) => {
    this.visibleListeners.add(listener);
    return () => {
      this.visibleListeners.delete(listener);
    };
  };
  setVisible(value) {
    if (this.visible === value) return;
    this.visible = value;
    for (const listener of this.visibleListeners) listener();
  }
  requestOpen(sessionId) {
    void sessionId;
    this.setVisible(true);
  }
  requestHide() {
    this.setVisible(false);
  }
  setEnabled = (value) => this.patchSettings({ enabled: value });
  setAutoOpen = (value) => this.patchSettings({ autoOpen: value });
  setDims = (dims) => this.patchSettings({ dims });
  setPalette = (palette) => this.patchSettings({ palette });
  setPersist = (value) => this.patchSettings({ persist: value });
  /* ------------------------------------------------------------------ faces */
  faceFor(sessionId) {
    return this.storeFor(sessionId);
  }
  storeFor(sessionId) {
    let store = this.stores.get(sessionId);
    if (store === void 0) {
      store = new SessionStore(sessionId, this);
      this.stores.set(sessionId, store);
    }
    return store;
  }
  /* -------------------------------------------------------------- settings */
  patchSettings(patch) {
    const previous = this.settingsValue;
    const next = { ...previous, ...patch };
    if (next.enabled === previous.enabled && next.autoOpen === previous.autoOpen && next.dims === previous.dims && next.palette === previous.palette && next.persist === previous.persist) {
      return;
    }
    this.settingsValue = next;
    saveSettings(next);
    for (const store of this.stores.values()) store.onSettingsChanged(previous);
    if (previous.persist && !next.persist) clearAllHistory();
    if (!next.enabled && previous.enabled) {
      this.setVisible(false);
      this.detach();
    } else if (next.enabled && !previous.enabled) {
      this.syncMounted(true);
    }
  }
  /* ------------------------------------------------------------- attachment */
  syncMounted(force = false) {
    const sessionId = this.ctx.sidebarRight.mounted.getSnapshot();
    if (this.lastMounted !== sessionId) {
      this.lastMounted = sessionId;
      for (const listener of this.activeListeners) listener();
    }
    if (!force && this.attached?.sessionId === sessionId) return;
    this.detach();
    this.attachAttempts = 0;
    if (sessionId === void 0 || !this.settingsValue.enabled) return;
    const binding = this.ctx.sessions.binding(sessionId);
    if (binding === void 0) {
      this.scheduleAttach();
      return;
    }
    const onSnapshot = () => this.onSessionSnapshot(sessionId, binding.session.getSnapshot());
    const onWindow = () => this.onWindow(sessionId, binding.eventSource.getSnapshot());
    const disposeSnapshot = binding.session.subscribe(onSnapshot);
    const disposeWindow = binding.eventSource.subscribe(onWindow);
    this.attached = {
      sessionId,
      dispose: () => {
        disposeSnapshot();
        disposeWindow();
      }
    };
    this.attachAttempts = 0;
    this.onWindow(sessionId, binding.eventSource.getSnapshot());
    this.onSessionSnapshot(sessionId, binding.session.getSnapshot());
  }
  scheduleAttach() {
    if (this.retryTimer !== void 0 || this.attachAttempts > 20) return;
    this.attachAttempts += 1;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = void 0;
      this.syncMounted(true);
    }, 140);
  }
  detach() {
    if (this.retryTimer !== void 0) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = void 0;
    }
    this.attached?.dispose();
    this.attached = void 0;
  }
  /* ---------------------------------------------------------------- capture */
  onSessionSnapshot(sessionId, snapshot) {
    const pending = snapshot?.pendingSubmissions;
    if (!Array.isArray(pending)) return;
    for (const submission of pending) {
      if (typeof submission?.text !== "string") continue;
      const id = `pending:${String(submission.requestId ?? "")}`;
      this.capture(sessionId, submission.text, {
        id,
        time: Number(submission.time) || Date.now(),
        live: true
      });
    }
  }
  onWindow(sessionId, window2) {
    const entries = window2?.entries;
    if (!Array.isArray(entries)) return;
    const users = [];
    let answer;
    for (const entry of entries) {
      if (entry?.type !== "event") continue;
      const event = entry.event;
      if (event?.type === "assistant/message") {
        const message = event.data?.message;
        if (message?.role !== "assistant") continue;
        const text2 = textOfContent(message.content);
        if (text2.trim().length === 0) continue;
        const candidate = {
          seq: Number(event.seq) || 0,
          time: Number(event.time) || Date.now(),
          id: typeof message.id === "string" ? message.id : `answer:${String(event.seq)}`,
          text: text2
        };
        if (answer === void 0 || candidate.seq > answer.seq) answer = candidate;
        continue;
      }
      if (event?.type !== "user/message") continue;
      const data = event.data;
      if (data?.source?.kind !== "user") continue;
      const text = textOfContent(data.content);
      if (text.trim().length === 0) continue;
      users.push({
        seq: Number(event.seq) || 0,
        time: Number(event.time) || Date.now(),
        id: typeof data.id === "string" ? data.id : `seq:${String(event.seq)}`,
        text
      });
    }
    if (answer !== void 0 && this.settingsValue.enabled) {
      const previousAnswer = this.lastAnswerSeq.get(sessionId);
      if (previousAnswer === void 0 || answer.seq > previousAnswer) {
        this.lastAnswerSeq.set(sessionId, answer.seq);
        this.storeFor(sessionId).setAnswer(answer.text, answer.time);
      }
    }
    if (users.length === 0) return;
    users.sort((a, b) => a.seq - b.seq);
    const previous = this.lastSeq.get(sessionId);
    const fresh = previous === void 0 ? users.slice(-24) : users.filter((entry) => entry.seq > previous);
    for (const entry of fresh) {
      this.capture(sessionId, entry.text, { id: entry.id, time: entry.time, live: false });
    }
    this.lastSeq.set(sessionId, Math.max(previous ?? -1, users[users.length - 1].seq));
  }
  capture(sessionId, rawText, options) {
    if (!this.settingsValue.enabled) return;
    const text = normalizeText(rawText);
    if (text.length === 0) return;
    const store = this.storeFor(sessionId);
    if (store.hasId(options.id)) return;
    if (!options.live && this.consumePending(text)) return;
    if (options.live && store.hasRecentText(text, 1200)) return;
    const analysis = analyze(text, this.settingsValue.dims);
    const point = {
      id: options.id,
      text: text.slice(0, 4e3),
      time: options.time,
      capturedAt: Date.now(),
      ...analysis
    };
    const added = store.add(point);
    if (!added) return;
    if (options.live) {
      this.pendingTexts.push({ text, at: Date.now() });
      if (this.pendingTexts.length > 12) this.pendingTexts.splice(0, this.pendingTexts.length - 12);
      if (this.settingsValue.autoOpen) this.requestOpen(sessionId);
    }
  }
  consumePending(text) {
    const now = Date.now();
    const index = this.pendingTexts.findIndex((entry) => entry.text === text && now - entry.at < 3e5);
    if (index < 0) return false;
    this.pendingTexts.splice(index, 1);
    return true;
  }
  /* ------------------------------------------------------------ lifecycle */
  dispose() {
    this.detach();
    this.mountDispose?.();
    this.mountDispose = void 0;
    for (const store of this.stores.values()) store.dispose();
    this.stores.clear();
  }
};

// src/client/Floating.tsx
var import_react4 = require("react");

// src/client/Panel.tsx
var import_react3 = require("react");

// src/client/NebulaCanvas.tsx
var import_react = require("react");

// src/client/canvas.ts
var TAU = Math.PI * 2;
function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = state + 1831565813 >>> 0;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hexToRgba(hex, alpha) {
  const value = hex.trim();
  if (value.startsWith("rgba(") || value.startsWith("rgb(")) return value;
  let body = value.startsWith("#") ? value.slice(1) : value;
  if (body.length === 3) body = body.split("").map((ch) => ch + ch).join("");
  const int = Number.parseInt(body, 16);
  if (Number.isNaN(int)) return `rgba(140, 190, 255, ${alpha})`;
  const r = int >> 16 & 255;
  const g = int >> 8 & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
var SPRITE_SIZE = 64;
var SpriteCache = class {
  cache = /* @__PURE__ */ new Map();
  get(color) {
    const hit = this.cache.get(color);
    if (hit !== void 0) return hit;
    const canvas = document.createElement("canvas");
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
      const c = SPRITE_SIZE / 2;
      const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.98)");
      gradient.addColorStop(0.16, hexToRgba(color, 0.92));
      gradient.addColorStop(0.42, hexToRgba(color, 0.34));
      gradient.addColorStop(0.72, hexToRgba(color, 0.07));
      gradient.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    }
    this.cache.set(color, canvas);
    return canvas;
  }
};

// src/client/NebulaCanvas.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var STAR_TINTS = ["#dfeaff", "#bcd7ff", "#ffe9c9", "#ffffff"];
var PERSPECTIVE = 0.64;
function NebulaCanvas({ face, point, settings, playing }) {
  const hostRef = (0, import_react.useRef)(null);
  const canvasRef = (0, import_react.useRef)(null);
  const stateRef = (0, import_react.useRef)({ point, settings, playing });
  stateRef.current = { point, settings, playing };
  (0, import_react.useEffect)(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (host === null || canvas === null) return;
    const sprites = new SpriteCache();
    const rng = makeRng(797580349);
    const stars = [];
    for (let i = 0; i < 140; i++) {
      stars.push({
        x: rng(),
        y: rng(),
        size: 0.45 + Math.pow(rng(), 2.2) * 1.9,
        phase: rng() * TAU,
        speed: 0.12 + rng() * 0.55,
        tint: Math.floor(rng() * STAR_TINTS.length)
      });
    }
    const arms = [];
    for (let arm = 0; arm < 4; arm++) {
      for (let i = 0; i < 220; i++) {
        const t = 0.04 + Math.pow(rng(), 0.64) * 0.96;
        const tint = clamp(Math.floor(t * 3.15 + (rng() - 0.5) * 0.9), 0, 3);
        arms.push({
          arm,
          t,
          jitter: (rng() - 0.5) * 0.26,
          radial: (rng() - 0.5) * 0.075,
          band: clamp(Math.floor(t * 255 + (rng() - 0.5) * 14), 0, 255),
          size: 0.35 + rng() * 1.2,
          hot: rng() > 0.975,
          wobble: rng() * TAU,
          tint
        });
      }
    }
    const clouds = [];
    for (let i = 0; i < 40; i++) {
      const t = 0.08 + rng() * 0.9;
      const tint = clamp(Math.floor(t * 3.15 + (rng() - 0.5) * 0.7), 0, 3);
      clouds.push({
        arm: Math.floor(rng() * 4),
        t,
        band: Math.floor(t * 255),
        size: 0.1 + rng() * 0.3,
        alpha: 0.022 + rng() * 0.052,
        tint
      });
    }
    const motes = [];
    for (let i = 0; i < 40; i++) {
      motes.push({
        r: Math.pow(rng(), 0.55) * 1.14,
        theta: rng() * TAU,
        size: 1.4 + rng() * 3.8,
        phase: rng() * TAU,
        tint: Math.floor(rng() * 4)
      });
    }
    const grainTile = document.createElement("canvas");
    grainTile.width = 128;
    grainTile.height = 128;
    const grainCtx = grainTile.getContext("2d");
    if (grainCtx !== null) {
      const noise = grainCtx.createImageData(128, 128);
      for (let i = 0; i < noise.data.length; i += 4) {
        const value = 128 + Math.round((rng() * 2 - 1) * 52);
        noise.data[i] = value;
        noise.data[i + 1] = value;
        noise.data[i + 2] = value;
        noise.data[i + 3] = 255;
      }
      grainCtx.putImageData(noise, 0, 0);
    }
    let grainPattern = null;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;
    let disposed = false;
    let last = performance.now();
    let lastPid;
    let angle = 0;
    let energy = 0.55;
    let enter = 0;
    let shock = 0;
    let hoverGlow = 0;
    let parallaxX = 0;
    let parallaxY = 0;
    let parallaxTargetX = 0;
    let parallaxTargetY = 0;
    let pointerX = -1e4;
    let pointerY = -1e4;
    let pointerIn = false;
    let ripple = 0;
    let rippleX = 0;
    let rippleY = 0;
    let meteorWait = 6.5 + rng() * 4;
    let meteorLife = 0;
    let meteorX = 0;
    let meteorY = 0;
    let meteorVX = 0;
    let meteorVY = 0;
    let meteorTail = 90;
    const profile = new Float32Array(256);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      width = rect.width;
      height = rect.height;
      dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    };
    const onPointerMove = (event) => {
      const rect = host.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      parallaxTargetX = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      parallaxTargetY = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      pointerIn = true;
    };
    const onPointerLeave = () => {
      parallaxTargetX = 0;
      parallaxTargetY = 0;
      pointerIn = false;
    };
    const onPointerDown = (event) => {
      const rect = host.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      rippleX = event.clientX - rect.left;
      rippleY = event.clientY - rect.top;
      ripple = 1;
    };
    const draw = (now) => {
      const state = stateRef.current;
      const density = state.settings.dims === 8192 ? 1 : 0.62;
      const wantedDpr = clamp(window.devicePixelRatio || 1, 1, 1.75);
      if (Math.abs(wantedDpr - dpr) > 0.01) dpr = wantedDpr;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx === null) return;
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      const dt = Math.min(0.05, Math.max(1e-3, (now - last) / 1e3));
      last = now;
      const pid = state.point?.id;
      if (pid !== lastPid) {
        lastPid = pid;
        if (pid !== void 0) {
          shock = 1;
          enter = 0;
        }
      }
      if (enter < 1) enter = Math.min(1, enter + dt / 0.95);
      if (shock > 0) shock = Math.max(0, shock - dt / 1.6);
      hoverGlow += ((state.playing ? 1 : 0) - hoverGlow) * Math.min(1, dt * 4);
      if (ripple > 0) ripple = Math.max(0, ripple - dt / 1.05);
      if (meteorLife > 0) {
        meteorLife = Math.max(0, meteorLife - dt / 1.25);
      } else if (!reduce) {
        meteorWait -= dt;
        if (meteorWait <= 0) {
          meteorWait = 7 + rng() * 9;
          meteorLife = 1;
          const lean = 0.2 + rng() * 0.26;
          const swift = 300 + rng() * 220;
          meteorX = width * (-0.12 + rng() * 0.72);
          meteorY = height * (0.04 + rng() * 0.42);
          meteorVX = Math.cos(lean) * swift;
          meteorVY = Math.sin(lean) * swift;
          meteorTail = 70 + rng() * 80;
        }
      }
      const roam = state.playing ? face.sequenceAt(now) : void 0;
      let scheme = schemeOf(0, state.settings.palette);
      let magnitude = 0.55;
      if (roam !== void 0) {
        const mix = roam.mix;
        for (let i = 0; i < 256; i++) profile[i] = roam.a.profile[i] + (roam.b.profile[i] - roam.a.profile[i]) * mix;
        scheme = schemeOf(mix < 0.5 ? roam.a.schemeBase : roam.b.schemeBase, state.settings.palette);
        magnitude = roam.a.magnitude + (roam.b.magnitude - roam.a.magnitude) * mix;
      } else if (state.point !== void 0) {
        profile.set(state.point.profile);
        scheme = schemeOf(state.point.schemeBase, state.settings.palette);
        magnitude = state.point.magnitude;
      } else {
        for (let i = 0; i < 256; i++) {
          profile[i] = 0.32 + 0.26 * Math.sin(i * 0.105 + now * 9e-4) + 0.17 * Math.sin(i * 0.037 - now * 13e-4);
        }
      }
      const speed = reduce ? 6e-3 : 0.045 + magnitude * 0.08 + hoverGlow * 0.11;
      angle += dt * speed;
      const target = state.playing ? 1.16 : state.point === void 0 ? 0.66 : 0.8 + magnitude * 0.28;
      energy += (target - energy) * Math.min(1, dt * 3);
      const ease = Math.min(1, dt * 3.4);
      parallaxX += (parallaxTargetX - parallaxX) * ease;
      parallaxY += (parallaxTargetY - parallaxY) * ease;
      const driftX = reduce ? 0 : parallaxX * 5;
      const driftY = reduce ? 0 : parallaxY * 4;
      const midX = width / 2;
      const midY = height * 0.51;
      const cx = midX + driftX;
      const cy = midY + driftY;
      const breath = reduce ? 1 : 1 + Math.sin(now * 21e-5) * 0.016;
      const radius = Math.max(40, Math.min(width * 0.41, height * 0.44) * energy * breath);
      const paletteName = PALETTE_NAMES[state.settings.palette % PALETTE_NAMES.length] ?? PALETTE_NAMES[0];
      const bg = ctx.createRadialGradient(cx, cy * 0.86, 0, cx, cy, Math.max(width, height) * 0.92);
      bg.addColorStop(0, "#0b1026");
      bg.addColorStop(0.42, "#060a19");
      bg.addColorStop(0.78, "#040611");
      bg.addColorStop(1, "#020308");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const ambient = ctx.createRadialGradient(cx, cy, radius * 0.04, cx, cy, Math.max(width, height) * 0.58);
      ambient.addColorStop(0, "rgba(86, 132, 255, 0.11)");
      ambient.addColorStop(0.3, hexToRgba(scheme.accent, 0.07));
      ambient.addColorStop(0.62, "rgba(122, 82, 255, 0.045)");
      ambient.addColorStop(1, "rgba(2, 3, 8, 0)");
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, width, height);
      for (const cloud of clouds) {
        const pv = profile[cloud.band];
        const theta = cloud.arm * (TAU / 4) + cloud.t * 4 + pv * 0.35 + angle * 0.8 + Math.sin(cloud.t * 17 + cloud.arm) * 0.035;
        const r = radius * (0.06 + cloud.t * 1.02) * (0.92 + pv * 0.16) * (1 + Math.sin(cloud.t * 23 + cloud.arm * 2) * 0.025);
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r * PERSPECTIVE;
        const size = radius * cloud.size * (2.4 + pv * 1.2);
        ctx.globalAlpha = cloud.alpha * (0.45 + pv * 0.9) * (0.5 + enter * 0.5);
        ctx.drawImage(sprites.get(scheme.arms[cloud.tint % 4]), x - size / 2, y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      for (let arm = 0; arm < 4; arm++) {
        ctx.beginPath();
        for (let step = 0; step <= 44; step++) {
          const t = 0.09 + step / 44 * 0.91;
          const pv = profile[Math.min(255, Math.floor(t * 255))];
          const theta = arm * (TAU / 4) + t * 4 + pv * 0.35 + angle * 0.8;
          const r = radius * (0.06 + t * 1.02) * (0.92 + pv * 0.16);
          const x = cx + Math.cos(theta) * r;
          const y = cy + Math.sin(theta) * r * PERSPECTIVE;
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = hexToRgba(scheme.arms[1], 0.045);
        ctx.lineWidth = 30;
        ctx.stroke();
        ctx.strokeStyle = hexToRgba(scheme.accent, 0.075);
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.strokeStyle = hexToRgba(scheme.core, 0.14);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.beginPath();
        for (let step = 0; step <= 36; step++) {
          const t = 0.12 + step / 36 * 0.88;
          const pv = profile[Math.min(255, Math.floor(t * 255))];
          const theta = arm * (TAU / 4) + t * 4 + pv * 0.35 + angle * 0.8 + 0.16;
          const r = radius * (0.06 + t * 1.02) * (0.92 + pv * 0.16) * 0.99;
          const x = cx + Math.cos(theta) * r;
          const y = cy + Math.sin(theta) * r * PERSPECTIVE;
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = hexToRgba(scheme.arms[2], 0.032);
        ctx.lineWidth = 18;
        ctx.stroke();
      }
      for (let arm = 0; arm < 4; arm++) {
        for (let step = 0; step <= 80; step++) {
          const t = 0.05 + step / 80 * 0.95;
          const pv = profile[Math.min(255, Math.floor(t * 255))];
          const theta = arm * (TAU / 4) + t * 4 + pv * 0.35 + angle * 0.8 + Math.sin(t * 9 + arm) * 0.018;
          const r = radius * (0.06 + t * 1.02) * (0.92 + pv * 0.16) * (1 + Math.sin(t * 7 + arm) * 0.018);
          const x = cx + Math.cos(theta) * r;
          const y = cy + Math.sin(theta) * r * PERSPECTIVE;
          const size = radius * (0.17 + t * 0.13) * (0.9 + pv * 0.5);
          const tint = clamp(Math.floor(t * 3.15), 0, 3);
          const base = (0.017 + pv * 0.024) * (0.35 + enter * 0.65);
          for (const [scale, weight] of [[0.95, 0.6], [1.75, 0.4]]) {
            const spread = size * scale;
            ctx.globalAlpha = base * weight;
            ctx.drawImage(sprites.get(scheme.arms[tint]), x - spread / 2, y - spread / 2, spread, spread);
          }
        }
      }
      const armCount = Math.floor(arms.length * density);
      for (let index = 0; index < armCount; index++) {
        const particle = arms[index];
        const pv = profile[particle.band];
        const theta = particle.arm * (TAU / 4) + particle.t * 4 + pv * 0.35 + particle.jitter + angle * 0.8;
        const r = radius * (0.06 + particle.t * 1.02) * (0.92 + pv * 0.16) * (1 + particle.radial);
        const wobble = 1 + Math.sin(now * 8e-4 + particle.wobble) * 8e-3;
        const x = cx + Math.cos(theta) * r * wobble;
        const y = cy + Math.sin(theta) * r * PERSPECTIVE * wobble;
        const fade = (0.35 + 0.65 * Math.min(1, particle.t * 2.4)) * (0.35 + enter * 0.65);
        const size = (3.4 + particle.t * 8.4 + pv * 6) * (0.7 + particle.size * 0.55);
        const color = particle.hot ? scheme.core : scheme.arms[particle.tint];
        ctx.globalAlpha = (0.024 + pv * 0.09) * fade * (particle.hot ? 1.7 : 1);
        ctx.drawImage(sprites.get(color), x - size / 2, y - size / 2, size, size);
        if (!reduce && (particle.hot || index % 5 === 0)) {
          const wakeTheta = theta - 0.022 - particle.t * 0.022;
          const wakeSize = size * 0.78;
          ctx.globalAlpha = (0.024 + pv * 0.09) * fade * (particle.hot ? 0.7 : 0.3);
          ctx.drawImage(
            sprites.get(color),
            cx + Math.cos(wakeTheta) * r * wobble - wakeSize / 2,
            cy + Math.sin(wakeTheta) * r * PERSPECTIVE * wobble - wakeSize / 2,
            wakeSize,
            wakeSize
          );
        }
        if (particle.hot || index % 3 === 0) {
          const halo = size * (particle.hot ? 2.5 : 1.9);
          ctx.globalAlpha = (particle.hot ? 0.08 : 0.03) * fade;
          ctx.drawImage(sprites.get(particle.hot ? scheme.accent : color), x - halo / 2, y - halo / 2, halo, halo);
        }
      }
      if (!reduce) {
        for (let bead = 0; bead < 4; bead++) {
          const k = (now * 75e-6 + bead / 4) % 1;
          const t = 0.16 + k * 0.78;
          const pv = profile[Math.min(255, Math.floor(t * 255))];
          const theta = bead * (TAU / 4) + t * 4 + pv * 0.35 + angle * 0.8;
          const r = radius * (0.06 + t * 1.02) * (0.92 + pv * 0.16);
          const size = radius * (0.075 - k * 0.02);
          ctx.globalAlpha = Math.sin(Math.PI * k) * 0.13 * (0.35 + enter * 0.65);
          ctx.drawImage(
            sprites.get(scheme.accent),
            cx + Math.cos(theta) * r - size / 2,
            cy + Math.sin(theta) * r * PERSPECTIVE - size / 2,
            size,
            size
          );
        }
      }
      for (const mote of motes) {
        const theta = mote.theta + angle * 0.25;
        const r = radius * mote.r * (0.98 + Math.sin(now * 4e-4 + mote.phase) * 0.02);
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r * PERSPECTIVE;
        const size = mote.size * (0.8 + Math.sin(now * 1e-3 + mote.phase) * 0.2);
        ctx.globalAlpha = 0.035;
        ctx.drawImage(sprites.get(scheme.arms[mote.tint]), x - size / 2, y - size / 2, size, size);
      }
      const starCount = Math.floor(stars.length * density);
      const accentStar = hexToRgba(scheme.accent, 1);
      for (let index = 0; index < starCount; index++) {
        const star = stars[index];
        const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(star.phase + now * 1e-3 * star.speed));
        const x = star.x * width + Math.sin(now * 8e-5 + star.phase) * 6 + driftX * 2.6;
        const y = star.y * height + Math.cos(now * 6e-5 + star.phase) * 4 + driftY * 2.2;
        let glint = 0;
        if (pointerIn && !reduce) {
          const gx = x - pointerX;
          const gy = y - pointerY;
          const d2 = gx * gx + gy * gy;
          if (d2 < 8100) {
            glint = 1 - Math.sqrt(d2) / 90;
            glint *= glint;
          }
        }
        ctx.globalAlpha = twinkle * (0.62 + glint * 0.85);
        ctx.fillStyle = star.tint === 3 && index % 7 === 0 ? accentStar : STAR_TINTS[star.tint];
        ctx.fillRect(x, y, star.size, star.size);
        if (star.size > 1.55) {
          ctx.globalAlpha = twinkle * 0.22;
          ctx.fillRect(x - 3, y + star.size / 2 - 0.25, 6 + star.size, 0.5);
          ctx.fillRect(x + star.size / 2 - 0.25, y - 3, 0.5, 6 + star.size);
        }
      }
      if (meteorLife > 0 && !reduce) {
        const env = Math.min(1, (1 - meteorLife) * 6) * Math.min(1, meteorLife * 1.8);
        const travelled = (1 - meteorLife) * 1.25;
        const hx = meteorX + meteorVX * travelled;
        const hy = meteorY + meteorVY * travelled;
        const speed2 = Math.hypot(meteorVX, meteorVY) || 1;
        const tailX = hx - meteorVX / speed2 * meteorTail;
        const tailY = hy - meteorVY / speed2 * meteorTail;
        const streak = ctx.createLinearGradient(tailX, tailY, hx, hy);
        streak.addColorStop(0, hexToRgba(scheme.accent, 0));
        streak.addColorStop(0.72, hexToRgba(scheme.accent, 0.16 * env));
        streak.addColorStop(1, hexToRgba(scheme.core, 0.62 * env));
        ctx.globalAlpha = 1;
        ctx.strokeStyle = streak;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.globalAlpha = env;
        const head = 7;
        ctx.drawImage(sprites.get(scheme.core), hx - head / 2, hy - head / 2, head, head);
      }
      const rayCount = Math.floor(64 * density);
      for (let i = 0; i < rayCount; i++) {
        const pv = profile[i * 11 % 256];
        if (pv < 0.18) continue;
        const theta = angle * 1.12 + i / 64 * TAU;
        const inner = radius * 0.12;
        const outer = inner + radius * (0.1 + pv * 0.5);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(theta) * inner, cy + Math.sin(theta) * inner * PERSPECTIVE);
        ctx.lineTo(cx + Math.cos(theta) * outer, cy + Math.sin(theta) * outer * PERSPECTIVE);
        ctx.strokeStyle = hexToRgba(scheme.arms[(i + 1) % 4], 0.02 + pv * 0.055);
        ctx.lineWidth = 0.5 + pv * 0.6;
        ctx.stroke();
      }
      const coreSize = (10 + magnitude * 8) * (1 + Math.sin(now * 2e-3) * 0.04) * (0.9 + enter * 0.1);
      ctx.globalAlpha = 0.5;
      ctx.drawImage(sprites.get(scheme.accent), cx - coreSize * 3.4, cy - coreSize * 3.4, coreSize * 6.8, coreSize * 6.8);
      ctx.globalAlpha = 0.95;
      ctx.drawImage(sprites.get(scheme.core), cx - coreSize * 1.6, cy - coreSize * 1.6, coreSize * 3.2, coreSize * 3.2);
      ctx.save();
      ctx.translate(cx, cy);
      for (let spike = 0; spike < 4; spike++) {
        const reach = coreSize * (spike < 2 ? 5.2 : 3.6);
        ctx.save();
        ctx.rotate(spike * Math.PI / 2);
        const glow = ctx.createLinearGradient(0, 0, reach, 0);
        glow.addColorStop(0, hexToRgba(scheme.core, 0.5));
        glow.addColorStop(0.35, hexToRgba(scheme.accent, 0.18));
        glow.addColorStop(1, hexToRgba(scheme.accent, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, -0.5, reach, 1);
        ctx.restore();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1.2, coreSize * 0.13), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.setLineDash([1.5, 6]);
      ctx.strokeStyle = hexToRgba(scheme.arms[2], 0.17);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.72, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([1, 9]);
      ctx.strokeStyle = hexToRgba(scheme.accent, 0.1);
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.36, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 96; i++) {
        const theta = -Math.PI / 2 + i / 96 * TAU + angle * 0.16;
        const long = i % 8 === 0;
        const r1 = radius * 1.06;
        const r2 = r1 + (long ? 6.5 : 2.2);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(theta) * r1, cy + Math.sin(theta) * r1);
        ctx.lineTo(cx + Math.cos(theta) * r2, cy + Math.sin(theta) * r2);
        ctx.strokeStyle = hexToRgba(scheme.core, long ? 0.26 : 0.1);
        ctx.lineWidth = long ? 1 : 0.55;
        ctx.stroke();
      }
      if (shock > 0) {
        const k = 1 - shock;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (1.04 + k * 0.55), 0, TAU);
        ctx.strokeStyle = hexToRgba(scheme.core, shock * 0.3);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (0.98 + k * 0.3), 0, TAU);
        ctx.strokeStyle = hexToRgba(scheme.accent, shock * 0.18);
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      if (ripple > 0 && !reduce) {
        const k = 1 - ripple;
        const spread = 18 + k * 140;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(rippleX, rippleY, spread, 0, TAU);
        ctx.strokeStyle = hexToRgba(scheme.accent, ripple * 0.3);
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rippleX, rippleY, spread * 0.6, 0, TAU);
        ctx.strokeStyle = hexToRgba(scheme.core, ripple * 0.16);
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
      if (roam !== void 0) {
        const theta = angle * 1.9 + roam.index * 0.38;
        const x = cx + Math.cos(theta) * radius * 0.56;
        const y = cy + Math.sin(theta) * radius * 0.42;
        const size = 15 + Math.sin(now * 0.01) * 3;
        ctx.globalAlpha = 0.95;
        ctx.drawImage(sprites.get(scheme.core), x - size / 2, y - size / 2, size, size);
        ctx.globalAlpha = 0.3;
        ctx.drawImage(sprites.get(scheme.accent), x - size * 1.7, y - size * 1.7, size * 3.4, size * 3.4);
      }
      ctx.restore();
      const vignette = ctx.createRadialGradient(midX, midY, radius * 0.52, midX, midY, Math.max(width, height) * 0.8);
      vignette.addColorStop(0, "rgba(2, 3, 8, 0)");
      vignette.addColorStop(0.65, "rgba(2, 3, 8, 0.16)");
      vignette.addColorStop(1, "rgba(2, 3, 8, 0.62)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
      if (grainCtx !== null && !reduce) {
        if (grainPattern === null) grainPattern = ctx.createPattern(grainTile, "repeat");
        if (grainPattern !== null) {
          ctx.globalCompositeOperation = "overlay";
          ctx.globalAlpha = 0.06;
          ctx.fillStyle = grainPattern;
          ctx.fillRect(0, 0, width, height);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
      ctx.shadowBlur = 6;
      ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(178, 210, 255, 0.58)";
      ctx.fillText(`VEC ${state.settings.dims}`, 12, 11);
      ctx.fillStyle = "rgba(178, 210, 255, 0.36)";
      ctx.fillText(`\u03A3 ${magnitude.toFixed(3)}`, 12, 24);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(188, 222, 255, 0.5)";
      const schemeLabel = `${scheme.name} \xB7 ${paletteName}`;
      if (ctx.measureText(schemeLabel).width > width - 140) ctx.font = "8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.fillText(schemeLabel, width - 12, 11);
      ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.fillStyle = "rgba(178, 210, 255, 0.32)";
      ctx.fillText(roam !== void 0 ? `TOKEN ${roam.index + 1}` : `PHASE ${(angle % TAU + TAU).toFixed(2)}`, width - 12, 24);
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "rgba(178, 210, 255, 0.34)";
      const roamLabel = roam !== void 0 ? roam.label : state.point === void 0 ? "AWAITING SIGNAL" : `TOK ${state.point.tokens}`;
      if (ctx.measureText(roamLabel).width > width - 100) ctx.font = "8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.fillText(roamLabel.slice(0, 24), 12, height - 10);
      ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textAlign = "right";
      ctx.fillText("DSH / NEBULA", width - 12, height - 10);
      ctx.shadowBlur = 0;
    };
    const frame = (now) => {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      draw(now);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (disposed || raf !== 0 || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf !== 0) cancelAnimationFrame(raf);
      raf = 0;
    };
    resize();
    host.addEventListener("pointermove", onPointerMove, { passive: true });
    host.addEventListener("pointerleave", onPointerLeave);
    host.addEventListener("pointerdown", onPointerDown, { passive: true });
    const observer = new ResizeObserver(() => {
      resize();
    });
    observer.observe(host);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) start();
      else stop();
    }, { threshold: 0.04 });
    intersection.observe(host);
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      disposed = true;
      stop();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("pointerdown", onPointerDown);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [face]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: hostRef, className: "dnp-canvas-host", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", { ref: canvasRef, className: "dnp-canvas" }) });
}

// src/client/NebulaMap.tsx
var import_react2 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
var MAP_EXTENT = 1.24;
function MapCanvas({ face, points, currentId, settings, playing }) {
  const hostRef = (0, import_react2.useRef)(null);
  const canvasRef = (0, import_react2.useRef)(null);
  const stateRef = (0, import_react2.useRef)({ points, currentId, settings, playing });
  stateRef.current = { points, currentId, settings, playing };
  const pointerRef = (0, import_react2.useRef)({ x: -1, y: -1, inside: false });
  const hoverRef = (0, import_react2.useRef)(void 0);
  (0, import_react2.useEffect)(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (host === null || canvas === null) return;
    const sprites = new SpriteCache();
    const stars = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.4 + Math.random() * 1.4,
        phase: Math.random() * TAU,
        tint: Math.floor(Math.random() * 4)
      });
    }
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let visible = true;
    let disposed = false;
    let last = performance.now();
    let sweep = 0;
    let shock = 1;
    let lastCurrent;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      width = rect.width;
      height = rect.height;
      dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    };
    const draw = (now) => {
      const ctx = canvas.getContext("2d", { alpha: true });
      if (ctx === null) return;
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      const state = stateRef.current;
      const dt = Math.min(0.05, Math.max(1e-3, (now - last) / 1e3));
      last = now;
      sweep += dt * (reduce ? 0 : 0.42);
      if (shock > 0) shock = Math.max(0, shock - dt / 1.2);
      if (state.currentId !== lastCurrent) {
        lastCurrent = state.currentId;
        shock = 1;
      }
      const scheme = schemeOf(state.points.at(-1)?.schemeBase ?? 0, state.settings.palette);
      const pad = 18;
      const plotW = Math.max(10, width - pad * 2);
      const plotH = Math.max(10, height - pad * 2);
      const toX = (value) => pad + (clamp(value, -MAP_EXTENT, MAP_EXTENT) + MAP_EXTENT) / (MAP_EXTENT * 2) * plotW;
      const toY = (value) => pad + (MAP_EXTENT - clamp(value, -MAP_EXTENT, MAP_EXTENT)) / (MAP_EXTENT * 2) * plotH;
      const cx = width / 2;
      const cy = height / 2;
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#04060e");
      bg.addColorStop(0.55, "#070b17");
      bg.addColorStop(1, "#03040a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      const wash = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
      wash.addColorStop(0, hexToRgba(scheme.arms[1], 0.08));
      wash.addColorStop(0.6, hexToRgba(scheme.arms[2], 0.03));
      wash.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      const terrain = [
        [0.24, 0.3, 0.34, 0.07],
        [0.74, 0.24, 0.28, 0.06],
        [0.62, 0.76, 0.4, 0.065],
        [0.18, 0.78, 0.26, 0.05],
        [0.5, 0.52, 0.5, 0.045]
      ];
      for (let index = 0; index < terrain.length; index++) {
        const [tx, ty, tr, ta] = terrain[index];
        const size = Math.max(width, height) * tr;
        ctx.globalAlpha = ta;
        ctx.drawImage(sprites.get(scheme.arms[index % 4]), width * tx - size / 2, height * ty - size / 2, size, size);
      }
      for (const star of stars) {
        ctx.globalAlpha = 0.18 + Math.abs(Math.sin(star.phase + now * 6e-4)) * 0.3;
        ctx.fillStyle = star.tint % 3 === 0 ? "#ffe9c9" : "#dceaff";
        ctx.fillRect(star.x * width, star.y * height, star.size, star.size);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(128, 170, 255, 0.075)";
      ctx.lineWidth = 0.6;
      for (let i = 0; i <= 8; i++) {
        const x = pad + i / 8 * plotW;
        const y = pad + i / 8 * plotH;
        ctx.beginPath();
        ctx.moveTo(x, pad);
        ctx.lineTo(x, pad + plotH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pad, y);
        ctx.lineTo(pad + plotW, y);
        ctx.stroke();
      }
      for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(plotW, plotH) / 2 * (ring / 4.4), 0, TAU);
        ctx.setLineDash([2, 6]);
        ctx.strokeStyle = `rgba(128, 170, 255, ${0.06 + ring * 0.012})`;
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(128, 170, 255, 0.09)";
      ctx.beginPath();
      ctx.moveTo(cx, pad);
      ctx.lineTo(cx, pad + plotH);
      ctx.moveTo(pad, cy);
      ctx.lineTo(pad + plotW, cy);
      ctx.stroke();
      ctx.strokeStyle = hexToRgba(scheme.core, 0.16);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, TAU);
      ctx.moveTo(cx - 7, cy);
      ctx.lineTo(cx - 4, cy);
      ctx.moveTo(cx + 4, cy);
      ctx.lineTo(cx + 7, cy);
      ctx.moveTo(cx, cy - 7);
      ctx.lineTo(cx, cy - 4);
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx, cy + 7);
      ctx.stroke();
      ctx.font = "8px ui-monospace, monospace";
      ctx.fillStyle = "rgba(150, 190, 255, 0.28)";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("\u2212X", pad, height - 6);
      ctx.textAlign = "right";
      ctx.fillText("+X", width - pad, height - 6);
      ctx.textAlign = "center";
      ctx.fillText("\u2212Y", cx, pad + 10);
      const sweepRadius = Math.min(plotW, plotH) * 0.5;
      for (let trailIndex = 3; trailIndex >= 0; trailIndex--) {
        const theta = sweep - trailIndex * 0.045;
        const ray = ctx.createLinearGradient(cx, cy, cx + Math.cos(theta) * sweepRadius, cy + Math.sin(theta) * sweepRadius);
        ray.addColorStop(0, hexToRgba(scheme.accent, trailIndex === 0 ? 0.22 : 0.08));
        ray.addColorStop(0.55, hexToRgba(scheme.accent, trailIndex === 0 ? 0.08 : 0.025));
        ray.addColorStop(1, hexToRgba(scheme.accent, 0));
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(theta) * sweepRadius, cy + Math.sin(theta) * sweepRadius);
        ctx.strokeStyle = ray;
        ctx.lineWidth = trailIndex === 0 ? 0.9 : 0.6;
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(150, 190, 255, 0.2)";
      ctx.lineWidth = 1;
      const bracket = 11;
      const corners = [
        [pad - 5, pad - 5, 1, 1],
        [width - pad + 5, pad - 5, -1, 1],
        [pad - 5, height - pad + 5, 1, -1],
        [width - pad + 5, height - pad + 5, -1, -1]
      ];
      for (const [x, y, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(x + sx * bracket, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + sy * bracket);
        ctx.stroke();
      }
      const pointsNow = state.points;
      const palette = state.settings.palette;
      const trail = pointsNow.slice(-40);
      const ghostPoint = state.playing ? face.sequenceAt(now) : void 0;
      if (ghostPoint !== void 0) {
        const gx = toX(ghostPoint.a.mapX + (ghostPoint.b.mapX - ghostPoint.a.mapX) * ghostPoint.mix);
        const gy = toY(ghostPoint.a.mapY + (ghostPoint.b.mapY - ghostPoint.a.mapY) * ghostPoint.mix);
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.9;
        const size = 16;
        ctx.drawImage(sprites.get(scheme.core), gx - size / 2, gy - size / 2, size, size);
        ctx.globalAlpha = 0.4;
        ctx.drawImage(sprites.get(scheme.accent), gx - size * 1.5, gy - size * 1.5, size * 3, size * 3);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = hexToRgba(scheme.core, 0.7);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gx, gy - 6);
        ctx.lineTo(gx + 6, gy);
        ctx.lineTo(gx, gy + 6);
        ctx.lineTo(gx - 6, gy);
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = hexToRgba(scheme.core, 0.7);
        ctx.font = "8px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`TOK ${ghostPoint.index + 1}`, gx + 10, gy - 6);
      }
      if (trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(toX(trail[0].mapX), toY(trail[0].mapY));
        for (let i = 1; i < trail.length; i++) {
          const prev = trail[i - 1];
          const next = trail[i];
          const mx = (toX(prev.mapX) + toX(next.mapX)) / 2;
          const my = (toY(prev.mapY) + toY(next.mapY)) / 2;
          ctx.quadraticCurveTo(toX(prev.mapX), toY(prev.mapY), mx, my);
        }
        const tail = trail[trail.length - 1];
        ctx.lineTo(toX(tail.mapX), toY(tail.mapY));
        ctx.strokeStyle = hexToRgba(scheme.accent, 0.24);
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(toX(trail[0].mapX), toY(trail[0].mapY));
        for (let i = 1; i < trail.length; i++) {
          const next = trail[i];
          ctx.lineTo(toX(next.mapX), toY(next.mapY));
        }
        ctx.strokeStyle = hexToRgba(scheme.core, 0.1);
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }
      const recent = pointsNow.slice(-18);
      for (let i = 0; i < recent.length; i++) {
        for (let j = i + 1; j < recent.length; j++) {
          const a = recent[i];
          const b = recent[j];
          const dx = a.mapX - b.mapX;
          const dy = a.mapY - b.mapY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 0.72) continue;
          ctx.beginPath();
          ctx.moveTo(toX(a.mapX), toY(a.mapY));
          ctx.lineTo(toX(b.mapX), toY(b.mapY));
          ctx.strokeStyle = hexToRgba(scheme.arms[(i + j) % 4], 0.05 + (1 - distance / 0.72) * 0.06);
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }
      for (let index = 0; index < pointsNow.length; index++) {
        const point = pointsNow[index];
        const x = toX(point.mapX);
        const y = toY(point.mapY);
        const age = pointsNow.length <= 1 ? 1 : index / (pointsNow.length - 1);
        const pointScheme = schemeOf(point.schemeBase, palette);
        const current2 = point.id === state.currentId;
        const size = (18 + point.magnitude * 30) * (current2 ? 1.35 : 1);
        ctx.globalAlpha = (0.08 + age * 0.14) * (current2 ? 1.4 : 1);
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(sprites.get(pointScheme.accent), x - size / 2, y - size / 2, size, size);
        ctx.globalAlpha = 0.45 + age * 0.4;
        ctx.fillStyle = pointScheme.core;
        ctx.beginPath();
        ctx.arc(x, y, 1.4 + point.magnitude * 1.6, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = pointScheme.arms[1];
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.arc(x, y, 4 + point.magnitude * 4, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        const pointer = pointerRef.current;
        if (pointer.inside) {
          const dx = pointer.x - x;
          const dy = pointer.y - y;
          if (dx * dx + dy * dy < 15 * 15) hoverRef.current = point.id;
        }
      }
      const current = pointsNow.find((point) => point.id === state.currentId) ?? pointsNow.at(-1);
      if (current !== void 0) {
        const x = toX(current.mapX);
        const y = toY(current.mapY);
        const pulse = 10 + Math.sin(now * 35e-4) * 4;
        ctx.strokeStyle = hexToRgba(scheme.core, 0.55);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(x, y, pulse, 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = hexToRgba(scheme.accent, 0.36);
        ctx.beginPath();
        ctx.moveTo(x - 14, y);
        ctx.lineTo(x - 6, y);
        ctx.moveTo(x + 6, y);
        ctx.lineTo(x + 14, y);
        ctx.moveTo(x, y - 14);
        ctx.lineTo(x, y - 6);
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x, y + 14);
        ctx.stroke();
        if (shock > 0) {
          const k = 1 - shock;
          ctx.beginPath();
          ctx.arc(x, y, 8 + k * 42, 0, TAU);
          ctx.strokeStyle = hexToRgba(scheme.core, shock * 0.45);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        const label = current.text.replace(/\s+/g, " ").trim().slice(0, 26);
        ctx.font = '10px system-ui, -apple-system, "Segoe UI", sans-serif';
        const metrics = ctx.measureText(label);
        const boxW = metrics.width + 14;
        const boxH = 20;
        let boxX = x + 10;
        let boxY = y - 30;
        if (boxX + boxW > width - 8) boxX = x - boxW - 10;
        if (boxY < 8) boxY = y + 14;
        ctx.fillStyle = "rgba(5, 8, 16, 0.82)";
        ctx.strokeStyle = hexToRgba(scheme.accent, 0.28);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = hexToRgba(scheme.core, 0.86);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, boxX + 7, boxY + boxH / 2 + 0.5);
      }
      const hovered = pointsNow.find((point) => point.id === hoverRef.current);
      if (hovered !== void 0) {
        const x = toX(hovered.mapX);
        const y = toY(hovered.mapY);
        const text = hovered.text.replace(/\s+/g, " ").trim();
        const label = text.length > 44 ? `${text.slice(0, 44)}\u2026` : text;
        ctx.font = '10px system-ui, -apple-system, "Segoe UI", sans-serif';
        const metrics = ctx.measureText(label);
        const boxW = metrics.width + 16;
        const boxH = 34;
        let boxX = x + 14;
        let boxY = y + 18;
        if (boxX + boxW > width - 8) boxX = x - boxW - 14;
        if (boxY + boxH > height - 8) boxY = y - boxH - 18;
        ctx.fillStyle = "rgba(4, 7, 15, 0.9)";
        ctx.strokeStyle = hexToRgba(scheme.core, 0.3);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();
        ctx.stroke();
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(226, 240, 255, 0.9)";
        ctx.fillText(label, boxX + 8, boxY + 6);
        ctx.fillStyle = "rgba(150, 190, 255, 0.5)";
        ctx.font = "9px ui-monospace, monospace";
        const when = new Date(hovered.time);
        const clock = Number.isNaN(when.getTime()) ? "--:--" : `${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`;
        ctx.fillText(`${clock}  TOK ${hovered.tokens}  \u03A3 ${hovered.magnitude.toFixed(2)}`, boxX + 8, boxY + 20);
      }
      const hudMask = ctx.createLinearGradient(0, 0, 0, 46);
      hudMask.addColorStop(0, "rgba(3, 5, 12, 0.78)");
      hudMask.addColorStop(0.7, "rgba(3, 5, 12, 0.4)");
      hudMask.addColorStop(1, "rgba(3, 5, 12, 0)");
      ctx.fillStyle = hudMask;
      ctx.fillRect(0, 0, width, 46);
      ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
      ctx.shadowBlur = 5;
      ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(172, 204, 255, 0.46)";
      ctx.fillText("SEMANTIC MAP", 12, 11);
      ctx.fillStyle = "rgba(172, 204, 255, 0.28)";
      ctx.fillText(`PTS ${pointsNow.length}`, 12, 24);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(172, 204, 255, 0.3)";
      const currentPoint = current;
      const coord = currentPoint === void 0 ? "X -- / Y --" : `X ${currentPoint.mapX >= 0 ? "+" : ""}${currentPoint.mapX.toFixed(2)} / Y ${currentPoint.mapY >= 0 ? "+" : ""}${currentPoint.mapY.toFixed(2)}`;
      if (ctx.measureText(coord).width > width - 96) ctx.font = "8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.fillText(coord, width - 12, 11);
      ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.fillText(state.playing ? "ROAMING" : "IDLE", width - 12, 24);
      if (pointsNow.length === 0) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(160, 196, 255, 0.4)";
        ctx.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
        ctx.fillText("\u7B49\u5F85\u8BED\u4E49\u6CE8\u5165", cx, cy + 4);
        ctx.fillStyle = "rgba(140, 176, 240, 0.24)";
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillText("SUBMIT A PROMPT TO PLOT", cx, cy + 22);
      }
      ctx.shadowBlur = 0;
    };
    const frame = (now) => {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      hoverRef.current = void 0;
      draw(now);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (disposed || raf !== 0 || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf !== 0) cancelAnimationFrame(raf);
      raf = 0;
    };
    const observer = new ResizeObserver(() => {
      resize();
      start();
    });
    observer.observe(host);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) start();
      else stop();
    }, { threshold: 0.01 });
    intersection.observe(host);
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    resize();
    start();
    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [face]);
  const onPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top, inside: true };
    event.currentTarget.style.cursor = hoverRef.current === void 0 ? "default" : "pointer";
  };
  const onPointerLeave = () => {
    pointerRef.current = { x: -1, y: -1, inside: false };
    hoverRef.current = void 0;
  };
  const onClick = () => {
    const id = hoverRef.current;
    if (id !== void 0) face.select(id);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dnp-canvas-host", ref: hostRef, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "canvas",
    {
      className: "dnp-canvas",
      ref: canvasRef,
      "aria-hidden": "true",
      onPointerMove,
      onPointerLeave,
      onClick
    }
  ) });
}

// src/client/icons.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function Glyph({ size = 16, className, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      className,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      focusable: "false",
      children
    }
  );
}
function NebulaGlyph(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(Glyph, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "12", cy: "12", r: "2.2", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ellipse", { cx: "12", cy: "12", rx: "9", ry: "4.2", transform: "rotate(-28 12 12)", opacity: "0.75" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ellipse", { cx: "12", cy: "12", rx: "9", ry: "4.2", transform: "rotate(38 12 12)", opacity: "0.45" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "19.2", cy: "7.6", r: "1.1", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "5.4", cy: "16.8", r: "0.9", fill: "currentColor", stroke: "none", opacity: "0.7" })
  ] });
}
function IconPower(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(Glyph, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M12 3v8" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M6.4 6.6a8 8 0 1 0 11.2 0" })
  ] });
}
function IconPlay(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M9 6.5 17.5 12 9 17.5Z" }) });
}
function IconStop(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("rect", { x: "7.5", y: "7.5", width: "9", height: "9", rx: "1.4" }) });
}
function IconPalette(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(Glyph, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M12 3.2a8.8 8.8 0 1 0 0 17.6c1.5 0 2.2-.9 2.2-1.9 0-.8-.4-1.2-.4-1.9 0-.9.7-1.6 1.8-1.6h1.6c2 0 3.6-1.6 3.6-3.7C20.8 6.5 16.9 3.2 12 3.2Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "8.2", cy: "9.4", r: "1", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "12.4", cy: "7.4", r: "1", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "16.2", cy: "9.8", r: "1", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "7.8", cy: "13.8", r: "1", fill: "currentColor", stroke: "none" })
  ] });
}
function IconSliders(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(Glyph, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M4 7h9M17 7h3M4 12h3M11 12h9M4 17h9M17 17h3" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "15", cy: "7", r: "1.8" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "9", cy: "12", r: "1.8" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("circle", { cx: "15", cy: "17", r: "1.8" })
  ] });
}
function IconChevron(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "m6 9.5 6 6 6-6" }) });
}
function IconMoon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z" }) });
}
function IconCollapse(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Glyph, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M4 5v14M20 5v14M14 8l-4 4 4 4" }) });
}
function IconSpark(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(Glyph, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M18.5 16.2 19.2 18l1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z", opacity: "0.7" })
  ] });
}

// src/client/Panel.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
function Switch({ checked, onChange, label }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    "button",
    {
      type: "button",
      role: "switch",
      "aria-checked": checked,
      "aria-label": label,
      className: "dnp-switch",
      "data-on": checked,
      onClick: () => onChange(!checked),
      children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dnp-switch-knob" })
    }
  );
}
function Panel({ face, onClose, onHeadPointerDown, onHeadPointerMove, onHeadPointerUp }) {
  const snapshot = (0, import_react3.useSyncExternalStore)(face.subscribe, face.getSnapshot, face.getSnapshot);
  const [sheet, setSheet] = (0, import_react3.useState)(false);
  const [confirmClear, setConfirmClear] = (0, import_react3.useState)(false);
  const confirmTimer = (0, import_react3.useRef)(void 0);
  const settings = snapshot.settings;
  const enabled = settings.enabled;
  const points = snapshot.points;
  const current = points.find((point) => point.id === snapshot.currentId) ?? points.at(-1);
  const playing = snapshot.playing;
  const playTitle = playing ? "\u505C\u6B62\u8BED\u4E49\u6F2B\u6E38" : snapshot.answer !== void 0 ? "\u64AD\u653E\u56DE\u7B54\u8BED\u4E49\u6F2B\u6E38" : "\u64AD\u653E\u8F93\u5165\u5E8F\u5217\u6F2B\u6E38";
  (0, import_react3.useEffect)(() => {
    if (!confirmClear) return;
    confirmTimer.current = window.setTimeout(() => setConfirmClear(false), 3200);
    return () => {
      if (confirmTimer.current !== void 0) window.clearTimeout(confirmTimer.current);
    };
  }, [confirmClear]);
  (0, import_react3.useEffect)(() => {
    if (!sheet) return;
    const onKey = (event) => {
      if (event.key === "Escape") setSheet(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);
  const paletteName = PALETTE_NAMES[settings.palette % PALETTE_NAMES.length] ?? PALETTE_NAMES[0];
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp", "data-enabled": enabled, "data-playing": playing, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "header",
      {
        className: "dnp-head",
        onPointerDown: onHeadPointerDown,
        onPointerMove: onHeadPointerMove,
        onPointerUp: onHeadPointerUp,
        onPointerCancel: onHeadPointerUp,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-brand", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dnp-brand-mark", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconSpark, { size: 17 }) }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dnp-brand-copy", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dnp-brand-title", children: "\u8BED\u4E49\u661F\u4E91" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dnp-brand-sub", children: "SEMANTIC NEBULA" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-badges", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dnp-badge", children: [
              "VEC ",
              settings.dims
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dnp-badge dnp-badge-pts", children: [
              points.length,
              " PTS"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              "button",
              {
                type: "button",
                className: "dnp-icon",
                "data-active": enabled,
                title: enabled ? "\u4F11\u7720\u53EF\u89C6\u5316" : "\u542F\u7528\u8F93\u5165\u8BED\u4E49\u53EF\u89C6\u5316",
                "aria-label": enabled ? "\u4F11\u7720\u53EF\u89C6\u5316" : "\u542F\u7528\u8F93\u5165\u8BED\u4E49\u53EF\u89C6\u5316",
                onClick: () => face.setEnabled(!enabled),
                children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconPower, { size: 15 })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              "button",
              {
                type: "button",
                className: "dnp-icon",
                "data-active": playing,
                disabled: current === void 0,
                title: playTitle,
                "aria-label": playTitle,
                onClick: () => face.play(),
                children: playing ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconStop, { size: 15 }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconPlay, { size: 15 })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
              "button",
              {
                type: "button",
                className: "dnp-icon dnp-icon-text",
                title: `\u914D\u8272\uFF1A${paletteName}\uFF08\u70B9\u51FB\u5207\u6362\uFF09`,
                "aria-label": `\u914D\u8272\uFF1A${paletteName}\uFF0C\u70B9\u51FB\u5207\u6362`,
                onClick: () => face.setPalette((settings.palette + 1) % PALETTE_NAMES.length),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconPalette, { size: 15 }),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dnp-palette-name", children: paletteName })
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              "button",
              {
                type: "button",
                className: "dnp-icon",
                "data-active": sheet,
                title: "\u663E\u793A\u8BBE\u7F6E",
                "aria-label": "\u663E\u793A\u8BBE\u7F6E",
                onClick: () => setSheet((open) => !open),
                children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconSliders, { size: 15 })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "dnp-icon", title: "\u6536\u8D77\u4E3A\u60AC\u6D6E\u7403", "aria-label": "\u6536\u8D77\u4E3A\u60AC\u6D6E\u7403", onClick: () => (onClose ?? face.hide)(), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconCollapse, { size: 15 }) })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-stage", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: "dnp-view dnp-nebula", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(NebulaCanvas, { face, point: current, settings, playing }),
        !enabled && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-overlay", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dnp-overlay-icon", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconMoon, { size: 22 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { children: "\u53EF\u89C6\u5316\u5DF2\u4F11\u7720" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { children: "\u5173\u95ED\u540E\u4E0D\u518D\u91C7\u96C6\u63D0\u4EA4\uFF0C\u4E5F\u4E0D\u4F1A\u4EA7\u751F\u65B0\u7684\u8BED\u4E49\u70B9\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "dnp-cta", onClick: () => face.setEnabled(true), children: "\u542F\u7528" })
        ] }),
        enabled && points.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-hint", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dnp-hint-dot" }),
          "\u7B49\u5F85\u8BED\u4E49\u6CE8\u5165 \xB7 \u53D1\u9001\u7B2C\u4E00\u6761\u63D0\u793A\u8BCD"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("section", { className: "dnp-view dnp-map", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        MapCanvas,
        {
          face,
          points,
          currentId: snapshot.currentId,
          settings,
          playing
        }
      ) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("footer", { className: "dnp-foot", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dnp-now", children: snapshot.answer !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-now-text", title: snapshot.answer.text, children: [
          "\u56DE\u7B54 \xB7 ",
          snapshot.answer.text
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-now-meta", children: [
          formatClock(snapshot.answer.time),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\xB7" }),
          "\u56DE\u7B54 ",
          snapshot.answer.text.length,
          " \u5B57\u7B26"
        ] })
      ] }) : current !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dnp-now-text", title: current.text, children: current.text }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-now-meta", children: [
          formatClock(current.time),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\xB7" }),
          current.tokens,
          " TOK",
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\xB7" }),
          "\u03A3 ",
          current.magnitude.toFixed(2)
        ] })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-now-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconWave, { size: 13 }),
        "\u5C1A\u65E0\u4FE1\u53F7 \xB7 \u53D1\u9001\u63D0\u793A\u8BCD\u5F00\u59CB\u8BB0\u5F55"
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dnp-foot-side", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dnp-mode", "data-playing": playing, children: playing ? "ROAM" : enabled ? "SNAPSHOT" : "SLEEP" }) })
    ] }),
    sheet && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dnp-backdrop", onClick: () => setSheet(false) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-sheet", role: "dialog", "aria-label": "\u8BED\u4E49\u661F\u4E91\u663E\u793A\u8BBE\u7F6E", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-sheet-head", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: "\u663E\u793A\u8BBE\u7F6E" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", className: "dnp-sheet-close", "aria-label": "\u5173\u95ED\u8BBE\u7F6E", onClick: () => setSheet(false), children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconChevron, { size: 14 }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dnp-row-label", children: "\u542F\u7528\u8F93\u5165\u8BED\u4E49\u53EF\u89C6\u5316" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dnp-row-hint", children: "\u603B\u5F00\u5173\uFF0C\u5173\u95ED\u540E\u63D2\u4EF6\u4F11\u7720" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Switch, { checked: enabled, onChange: (value) => face.setEnabled(value), label: "\u542F\u7528\u8F93\u5165\u8BED\u4E49\u53EF\u89C6\u5316" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dnp-row-label", children: "\u63D0\u4EA4\u540E\u81EA\u52A8\u5C55\u5F00" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dnp-row-hint", children: "\u53EA\u5728\u5F53\u524D\u4F1A\u8BDD\u7684\u63D0\u4EA4\u4E0A\u89E6\u53D1\u4E00\u6B21" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Switch, { checked: settings.autoOpen, onChange: (value) => face.setAutoOpen(value), label: "\u63D0\u4EA4\u540E\u81EA\u52A8\u5C55\u5F00" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dnp-row-label", children: "\u4FDD\u5B58\u8BED\u4E49\u8DB3\u8FF9" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dnp-row-hint", children: "\u5199\u5165\u672C\u673A localStorage\uFF0C\u4EC5\u672C\u8BBE\u5907\u53EF\u89C1" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Switch, { checked: settings.persist, onChange: (value) => face.setPersist(value), label: "\u4FDD\u5B58\u8BED\u4E49\u8DB3\u8FF9" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dnp-group-label", children: "\u5D4C\u5165\u7EF4\u5EA6" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-seg", children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", "data-on": settings.dims === 8192, onClick: () => face.setDims(8192), children: "8192 \xB7 \u6781\u81F4" }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", "data-on": settings.dims === 5120, onClick: () => face.setDims(5120), children: "5120 \xB7 \u6D41\u7545" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "dnp-note", children: "\u51E0\u4F55\u59CB\u7EC8\u6309 8192 \u7EF4\u8BA1\u7B97\uFF1B\u7EF4\u5EA6\u53EA\u6539\u53D8\u7C92\u5B50\u5BC6\u5EA6\u4E0E\u7EC6\u8282\uFF0C\u4E0D\u6539\u53D8\u661F\u4E91\u5F62\u72B6\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dnp-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dnp-group-label", children: "\u914D\u8272" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dnp-swatches", children: PALETTE_NAMES.map((name, index) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
            "button",
            {
              type: "button",
              "data-on": settings.palette === index,
              onClick: () => face.setPalette(index),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("i", { "data-palette": index }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: name })
              ]
            },
            name
          )) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            type: "button",
            className: "dnp-danger",
            "data-confirm": confirmClear,
            disabled: points.length === 0,
            onClick: () => {
              if (!confirmClear) {
                setConfirmClear(true);
                return;
              }
              face.clear();
              setConfirmClear(false);
            },
            children: confirmClear ? "\u518D\u6B21\u70B9\u51FB\u786E\u8BA4\u6E05\u7A7A" : "\u6E05\u7A7A\u672C\u4F1A\u8BDD\u8BED\u4E49\u8DB3\u8FF9"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "dnp-note dnp-note-foot", children: "\u6240\u6709\u5411\u91CF\u5728\u672C\u673A\u7531\u63D0\u793A\u8BCD\u786E\u5B9A\u6027\u751F\u6210\uFF0C\u4E0D\u8054\u7F51\uFF0C\u4E5F\u4E0D\u8BFB\u53D6\u6D88\u606F\u4EE5\u5916\u7684\u6570\u636E\u3002" })
      ] })
    ] })
  ] });
}
function IconWave({ size = 13 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("svg", { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { d: "M3 12h2.2l1.6-5.4 2.6 11 2.2-7.4 1.8 4.6 1.4-2.8H21" }) });
}

// src/client/Floating.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var RECT_KEY = "dsh-nebula:float:v1";
var MIN_W = 420;
var MIN_H = 300;
var MAX_W = 760;
var MAX_H = 600;
var MARGIN = 12;
function viewport() {
  return {
    width: typeof window === "undefined" ? 1440 : window.innerWidth,
    height: typeof window === "undefined" ? 900 : window.innerHeight
  };
}
function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function clampRect(rect) {
  const { width: vw, height: vh } = viewport();
  const maxW = Math.min(MAX_W, vw - MARGIN * 2);
  const maxH = Math.min(MAX_H, vh - MARGIN * 2);
  const width = clampNumber(rect.width, Math.min(MIN_W, maxW), maxW);
  const height = clampNumber(rect.height, Math.min(MIN_H, maxH), maxH);
  return {
    width,
    height,
    left: clampNumber(rect.left, MARGIN, Math.max(MARGIN, vw - width - MARGIN)),
    top: clampNumber(rect.top, MARGIN, Math.max(MARGIN, vh - height - MARGIN))
  };
}
function defaultRect() {
  const { width: vw, height: vh } = viewport();
  const width = Math.min(520, vw - MARGIN * 2);
  const height = Math.min(352, vh - MARGIN * 2);
  return clampRect({
    width,
    height,
    left: vw - width - 22,
    top: vh - height - 22
  });
}
function loadRect() {
  try {
    const raw = localStorage.getItem(RECT_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.left === "number" && typeof parsed.top === "number" && typeof parsed.width === "number" && typeof parsed.height === "number") {
        return clampRect(parsed);
      }
    }
  } catch {
  }
  return defaultRect();
}
function saveRect(rect) {
  try {
    localStorage.setItem(RECT_KEY, JSON.stringify(rect));
  } catch {
  }
}
function Launcher({ controller, count, enabled, accent }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dnf-launcher-wrap", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
    "button",
    {
      type: "button",
      className: "dnf-launcher",
      "data-off": !enabled,
      style: accent === void 0 ? void 0 : { "--dnf-accent": accent },
      title: enabled ? "\u6253\u5F00\u8BED\u4E49\u661F\u4E91" : "\u8BED\u4E49\u661F\u4E91\u5DF2\u4F11\u7720 \xB7 \u70B9\u51FB\u6253\u5F00",
      "aria-label": enabled ? "\u6253\u5F00\u8BED\u4E49\u661F\u4E91" : "\u8BED\u4E49\u661F\u4E91\u5DF2\u4F11\u7720\uFF0C\u70B9\u51FB\u6253\u5F00",
      onClick: () => {
        const sessionId = controller.activeSession();
        if (sessionId !== void 0) controller.requestOpen(sessionId);
      },
      children: [
        enabled ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(NebulaGlyph, { size: 20 }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dnf-launcher-moon", children: "\u263E" }),
        count > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dnf-launcher-count", children: count > 99 ? "99+" : count })
      ]
    }
  ) });
}
function FloatingNebula({ controller }) {
  const activeId = (0, import_react4.useSyncExternalStore)(controller.subscribeActive, controller.activeSession);
  const visible = (0, import_react4.useSyncExternalStore)(controller.subscribeVisible, controller.isVisible);
  const face = controller.faceFor(activeId ?? "");
  const snapshot = (0, import_react4.useSyncExternalStore)(face.subscribe, face.getSnapshot, face.getSnapshot);
  const [rect, setRect] = (0, import_react4.useState)(loadRect);
  const rectRef = (0, import_react4.useRef)(rect);
  rectRef.current = rect;
  const drag = (0, import_react4.useRef)(void 0);
  const resize = (0, import_react4.useRef)(void 0);
  (0, import_react4.useEffect)(() => {
    const onResize = () => setRect((current) => clampRect(current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const onHeadPointerDown = (event) => {
    if (event.button !== 0) return;
    if (event.target.closest("button, input, [data-no-drag]") !== null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    event.currentTarget.dataset.dragging = "true";
  };
  const onHeadPointerMove = (event) => {
    const state = drag.current;
    if (state === void 0) return;
    setRect(clampRect({
      ...rect,
      left: state.left + event.clientX - state.x,
      top: state.top + event.clientY - state.y
    }));
  };
  const onHeadPointerUp = (event) => {
    if (drag.current === void 0) return;
    drag.current = void 0;
    delete event.currentTarget.dataset.dragging;
    saveRect(rectRef.current);
  };
  const onResizeStart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resize.current = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height };
  };
  const onResizeMove = (event) => {
    const state = resize.current;
    if (state === void 0) return;
    const { width: vw, height: vh } = viewport();
    setRect((current) => clampRect({
      ...current,
      width: clampNumber(state.width + event.clientX - state.x, MIN_W, Math.min(MAX_W, vw - current.left - MARGIN)),
      height: clampNumber(state.height + event.clientY - state.y, MIN_H, Math.min(MAX_H, vh - current.top - MARGIN))
    }));
  };
  const onResizeEnd = () => {
    if (resize.current === void 0) return;
    resize.current = void 0;
    saveRect(rectRef.current);
  };
  const latest = snapshot.points[snapshot.points.length - 1];
  const accent = latest === void 0 ? void 0 : schemeOf(latest.schemeBase, snapshot.settings.palette).accent;
  if (!visible) {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Launcher, { controller, count: snapshot.points.length, enabled: snapshot.settings.enabled, accent });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
    "div",
    {
      className: "dnf-window",
      style: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          Panel,
          {
            face,
            onClose: () => controller.requestHide(),
            onHeadPointerDown,
            onHeadPointerMove,
            onHeadPointerUp
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "span",
          {
            className: "dnf-grip",
            title: "\u62D6\u52A8\u8C03\u6574\u5927\u5C0F",
            onPointerDown: onResizeStart,
            onPointerMove: onResizeMove,
            onPointerUp: onResizeEnd,
            onPointerCancel: onResizeEnd
          }
        )
      ]
    }
  );
}

// src/client/styles.ts
var STYLE_ID = "dsh-spiral-styles";
var CSS = `
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
`;
function installStyles() {
  if (typeof document === "undefined") return () => {
  };
  if (document.getElementById(STYLE_ID) !== null) return () => {
  };
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
  return () => {
    style.remove();
  };
}

// src/client/index.ts
var inject = ["sidebarRight", "sessions"];
function apply(ctx) {
  const controller = new NebulaController(ctx);
  ctx.effect(() => () => controller.dispose(), "dsh-spiral: controller");
  ctx.effect(() => installStyles(), "dsh-spiral: styles");
  ctx.effect(() => {
    if (typeof document === "undefined" || document.body === null) return () => {
    };
    const host = document.createElement("div");
    host.className = "dnf-root";
    host.dataset.dshNebula = "overlay";
    document.body.appendChild(host);
    const root = (0, import_client.createRoot)(host);
    root.render((0, import_react5.createElement)(FloatingNebula, { controller }));
    return () => {
      root.unmount();
      host.remove();
    };
  }, "dsh-spiral: floating overlay");
}
return module.exports; } });
