/**
 * Local, deterministic prompt geometry.
 *
 * No network, no model files: characters and n-grams are hashed into a sparse
 * high-dimensional vector, smoothed with an FFT Gaussian kernel, then folded
 * into a 256-band profile. The profile drives the nebula and is projected by a
 * fixed random basis into the 3D semantic map. The pipeline is dimension
 * invariant on purpose: 5120 and 8192 only change micro-detail.
 */

export type EmbeddingDims = 5120 | 8192

export const PROFILE_BANDS = 256
export const EMBED_DIMS: readonly EmbeddingDims[] = [8192, 5120]

export interface NebulaScheme {
  readonly id: string
  readonly name: string
  readonly arms: readonly string[]
  readonly dust: readonly string[]
  readonly core: string
  readonly accent: string
  readonly ambient: string
}

interface SchemeSeed {
  readonly id: string
  readonly name: string
  readonly arms: readonly [string, string, string, string]
  readonly core: string
  readonly ambient: string
}

/** Six curated color families; a palette is an ordering of them. */
const FAMILIES: readonly SchemeSeed[] = [
  {
    id: 'cryo',
    name: 'CRYO',
    arms: ['#63f3ff', '#3f86ff', '#a879ff', '#e9fdff'],
    core: '#f2feff',
    ambient: 'rgba(48, 150, 255, 0.20)',
  },
  {
    id: 'iris',
    name: 'IRIS',
    arms: ['#9a78ff', '#5f6bff', '#ff6ad5', '#efe6ff'],
    core: '#f8f2ff',
    ambient: 'rgba(120, 90, 255, 0.22)',
  },
  {
    id: 'rose',
    name: 'ROSE',
    arms: ['#ff6ad5', '#ff8aa8', '#ffd37a', '#fff0f8'],
    core: '#fff4fa',
    ambient: 'rgba(255, 90, 180, 0.18)',
  },
  {
    id: 'aurora',
    name: 'AURORA',
    arms: ['#83ffc8', '#5ef2ff', '#7f86ff', '#e6fff8'],
    core: '#f0fffb',
    ambient: 'rgba(70, 255, 190, 0.16)',
  },
  {
    id: 'ember',
    name: 'EMBER',
    arms: ['#ffc06b', '#ff7a63', '#ff6ad5', '#fff0d8'],
    core: '#fff7ea',
    ambient: 'rgba(255, 150, 80, 0.18)',
  },
  {
    id: 'abyss',
    name: 'ABYSS',
    arms: ['#3f9bff', '#5ef2ff', '#8a5cff', '#d8ecff'],
    core: '#eef9ff',
    ambient: 'rgba(40, 120, 255, 0.20)',
  },
]

/** Palette 0 deep space, 1 aurora, 2 solar — each a mood-filtered family set. */
const PALETTE_FAMILIES: readonly (readonly number[])[] = [
  [0, 5, 1, 2],
  [3, 0, 1, 5],
  [4, 2, 1, 0],
]

export const PALETTE_NAMES = ['深空', '极光', '日冕'] as const

/** Resolve the scheme for a stored base family under the active palette. */
export function schemeOf(base: number, palette: number): NebulaScheme {
  const families = PALETTE_FAMILIES[palette % PALETTE_FAMILIES.length] ?? PALETTE_FAMILIES[0]!
  const index = families[((base % families.length) + families.length) % families.length] ?? 0
  const family = FAMILIES[index] ?? FAMILIES[0]!
  return {
    id: family.id,
    name: family.name,
    arms: family.arms,
    dust: [family.arms[1]!, family.arms[2]!, family.arms[3]!],
    core: family.core,
    accent: family.arms[0]!,
    ambient: family.ambient,
  }
}

export interface Analysis {
  /** 256-band energy profile, 0..1. */
  readonly profile: Float32Array
  /** 256-band signed profile, used only for projection. */
  readonly signed: Float32Array
  /** Unit 3D semantic direction. */
  readonly axis: readonly [number, number, number]
  readonly mapX: number
  readonly mapY: number
  readonly schemeBase: number
  /** Projection energy, kept for the HUD readout. */
  readonly magnitude: number
  readonly tokens: number
}

export interface SequenceFrame extends Analysis {
  readonly label: string
  readonly index: number
}

const N = 8192
const FFT_SIZE = N
const KERNEL_SIGMA = 4.6
const MAX_FEATURES = 640
const SPARSE_GAIN = 0.075
const MAP_BASIS_SEED = 0x5e6b1a7d

/* ------------------------------------------------------------------ hashing */

export function hashString(text: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // Final avalanche.
  h ^= h >>> 16
  h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15
  h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------------------------------------------------------------------- fft */

function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = re[i]!
      re[i] = re[j]!
      re[j] = tr
      const ti = im[i]!
      im[i] = im[j]!
      im[j] = ti
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = ((inverse ? 2 : -2) * Math.PI) / len
    const wRe = Math.cos(angle)
    const wIm = Math.sin(angle)
    const half = len >> 1
    for (let i = 0; i < n; i += len) {
      let curRe = 1
      let curIm = 0
      for (let k = 0; k < half; k++) {
        const a = i + k
        const b = a + half
        const vRe = re[b]! * curRe - im[b]! * curIm
        const vIm = re[b]! * curIm + im[b]! * curRe
        const uRe = re[a]!
        const uIm = im[a]!
        re[a] = uRe + vRe
        im[a] = uIm + vIm
        re[b] = uRe - vRe
        im[b] = uIm - vIm
        const nextRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nextRe
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] = re[i]! / n
      im[i] = im[i]! / n
    }
  }
}

interface Spectrum {
  readonly re: Float64Array
  readonly im: Float64Array
}

let kernelSpectrum: Spectrum | undefined

function spectrumOfKernel(): Spectrum {
  if (kernelSpectrum !== undefined) return kernelSpectrum
  const re = new Float64Array(FFT_SIZE)
  const im = new Float64Array(FFT_SIZE)
  const denom = 2 * KERNEL_SIGMA * KERNEL_SIGMA
  for (let i = 0; i < FFT_SIZE; i++) {
    const d = Math.min(i, FFT_SIZE - i)
    re[i] = Math.exp(-(d * d) / denom)
  }
  fft(re, im, false)
  kernelSpectrum = { re, im }
  return kernelSpectrum
}

/* ----------------------------------------------------------------- features */

interface Feature {
  readonly key: string
  readonly weight: number
}

function collectFeatures(text: string): Feature[] {
  const normalized = text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
  if (normalized.length === 0) return [{ key: 'empty', weight: 1 }]

  const entries = new Map<string, { count: number; weight: number }>()
  const add = (key: string, weight: number): void => {
    const entry = entries.get(key)
    if (entry === undefined) entries.set(key, { count: 1, weight })
    else {
      entry.count += 1
      if (weight > entry.weight) entry.weight = weight
    }
  }

  // Latin / numeric words plus character trigrams.
  for (const match of normalized.matchAll(/[a-z0-9][a-z0-9_'-]*/g)) {
    const word = match[0]
    add(`w:${word}`, 1.35)
    if (word.length > 3) {
      for (let i = 0; i + 3 <= word.length; i++) add(`t:${word.slice(i, i + 3)}`, 0.42)
    }
    if (word.length > 6) add(`p:${word.slice(0, 3)}:${word.slice(-3)}`, 0.3)
  }

  // CJK: chars, bigrams, and skip-grams.
  const cjk = [...normalized].filter((ch) => /\p{Script=Han}/u.test(ch))
  for (let i = 0; i < cjk.length; i++) {
    const ch = cjk[i]!
    add(`c:${ch}`, 1.05)
    if (i + 1 < cjk.length) add(`b:${ch}${cjk[i + 1]!}`, 1.65)
    if (i + 2 < cjk.length) {
      add(`g:${ch}${cjk[i + 1]!}${cjk[i + 2]!}`, 0.72)
      add(`s:${ch}${cjk[i + 2]!}`, 0.32)
    }
  }

  // A coarse whole-prompt fingerprint keeps long prompts distinguishable.
  add(`x:${normalized.slice(0, 48)}`, 0.38)
  add(`y:${normalized.slice(-32)}`, 0.26)

  const features: Feature[] = []
  for (const [key, entry] of entries) {
    const weight = entry.weight * (1 + Math.log1p(entry.count - 1) * 0.55)
    features.push({ key, weight })
  }
  features.sort((a, b) => b.weight - a.weight || (a.key < b.key ? -1 : 1))
  return features.slice(0, MAX_FEATURES)
}

function embed(text: string, dims: EmbeddingDims): Float32Array {
  const features = collectFeatures(text)
  const spectrum = spectrumOfKernel()
  const re = new Float64Array(FFT_SIZE)
  const im = new Float64Array(FFT_SIZE)
  const sparse = new Float32Array(FFT_SIZE)

  for (const feature of features) {
    const h = hashString(feature.key)
    const spikes = 7
    for (let k = 0; k < spikes; k++) {
      const idx = (h + Math.imul(k, 0x9e3779b1)) & (FFT_SIZE - 1)
      const sign = (h >>> (k * 3)) & 1 ? 1 : -1
      const w = feature.weight / (1 + k * 0.36)
      sparse[idx] = sparse[idx]! + sign * w
      re[idx] = re[idx]! + sign * w
    }
  }

  fft(re, im, false)
  for (let i = 0; i < FFT_SIZE; i++) {
    const a = re[i]!
    const b = im[i]!
    re[i] = a * spectrum.re[i]! - b * spectrum.im[i]!
    im[i] = a * spectrum.im[i]! + b * spectrum.re[i]!
  }
  fft(re, im, true)

  const vector = new Float32Array(FFT_SIZE)
  let energy = 0
  for (let i = 0; i < FFT_SIZE; i++) {
    const v = re[i]! + sparse[i]! * SPARSE_GAIN
    vector[i] = v
    energy += v * v
  }
  const rms = Math.sqrt(energy / FFT_SIZE)

  // A low-frequency tilt gives every prompt a large-scale asymmetry that
  // survives band normalization, so the silhouette is never a plain ring.
  const phase = (hashString(text, 0x2f9a1c3d) / 4294967296) * Math.PI * 2
  const tilt = 0.34 * rms
  for (let i = 0; i < FFT_SIZE; i++) {
    vector[i] = vector[i]! + tilt * Math.sin((i / FFT_SIZE) * Math.PI * 6 + phase)
  }

  let sum = 0
  for (let i = 0; i < FFT_SIZE; i++) sum += vector[i]! * vector[i]!
  const norm = Math.sqrt(sum) || 1
  for (let i = 0; i < FFT_SIZE; i++) vector[i] = vector[i]! / norm

  return dims === 8192 ? vector : vector.slice(0, dims)
}

/* ------------------------------------------------------------------ profile */

let mapBasis: readonly [Float32Array, Float32Array, Float32Array] | undefined

function basisOf(): readonly [Float32Array, Float32Array, Float32Array] {
  if (mapBasis !== undefined) return mapBasis
  const rng = mulberry32(MAP_BASIS_SEED)
  const make = (): Float32Array => {
    const raw = new Float32Array(PROFILE_BANDS)
    let mean = 0
    for (let i = 0; i < PROFILE_BANDS; i++) {
      raw[i] = rng() < 0.5 ? -1 : 1
      mean += raw[i]!
    }
    mean /= PROFILE_BANDS
    let norm = 0
    for (let i = 0; i < PROFILE_BANDS; i++) {
      raw[i] = raw[i]! - mean
      norm += raw[i]! * raw[i]!
    }
    norm = Math.sqrt(norm) || 1
    for (let i = 0; i < PROFILE_BANDS; i++) raw[i] = raw[i]! / norm
    return raw
  }
  mapBasis = [make(), make(), make()]
  return mapBasis
}

function profileOf(vector: Float32Array): { profile: Float32Array; signed: Float32Array } {
  const dims = vector.length
  const profile = new Float32Array(PROFILE_BANDS)
  const signed = new Float32Array(PROFILE_BANDS)
  const counts = new Uint32Array(PROFILE_BANDS)
  const sums = new Float64Array(PROFILE_BANDS)
  const squares = new Float64Array(PROFILE_BANDS)
  for (let i = 0; i < dims; i++) {
    const band = Math.floor((i * PROFILE_BANDS) / dims)
    const v = vector[i]!
    sums[band] = sums[band]! + v
    squares[band] = squares[band]! + v * v
    counts[band] = counts[band]! + 1
  }
  let maxEnergy = 0
  let maxAbs = 0
  for (let b = 0; b < PROFILE_BANDS; b++) {
    const count = counts[b]! || 1
    const mean = sums[b]! / count
    const rms = Math.sqrt(squares[b]! / count)
    signed[b] = mean
    profile[b] = rms
    const abs = Math.abs(mean)
    if (abs > maxAbs) maxAbs = abs
    if (rms > maxEnergy) maxEnergy = rms
  }
  // Normalize the silhouette, then soften with a gamma and a three-tap blur.
  const energyMax = maxEnergy || 1
  for (let b = 0; b < PROFILE_BANDS; b++) {
    profile[b] = Math.pow(profile[b]! / energyMax, 0.72)
  }
  const smooth = new Float32Array(PROFILE_BANDS)
  for (let b = 0; b < PROFILE_BANDS; b++) {
    const a = profile[(b + PROFILE_BANDS - 1) % PROFILE_BANDS]!
    const c = profile[(b + 1) % PROFILE_BANDS]!
    smooth[b] = a * 0.22 + profile[b]! * 0.56 + c * 0.22
  }
  let smoothMax = 0
  for (let b = 0; b < PROFILE_BANDS; b++) if (smooth[b]! > smoothMax) smoothMax = smooth[b]!
  if (smoothMax > 0) {
    for (let b = 0; b < PROFILE_BANDS; b++) smooth[b] = smooth[b]! / smoothMax
  }
  const signedNorm = maxAbs || 1
  for (let b = 0; b < PROFILE_BANDS; b++) signed[b] = signed[b]! / signedNorm
  return { profile: smooth, signed }
}

/* ------------------------------------------------------------------- tokens */

export function tokenizePrompt(text: string): string[] {
  const tokens: string[] = []
  const re = /[\p{Script=Han}]|[A-Za-z0-9][A-Za-z0-9_'-]*|[^\s]/gu
  for (const match of text.normalize('NFKC').matchAll(re)) {
    tokens.push(match[0])
    if (tokens.length >= 48) break
  }
  return tokens
}

function windowText(tokens: readonly string[], index: number, radius = 2): string {
  const start = Math.max(0, index - radius)
  const end = Math.min(tokens.length, index + radius + 1)
  return tokens.slice(start, end).join(' ')
}

/* -------------------------------------------------------------------- analyze */

export function analyze(text: string, _dims: EmbeddingDims = 8192): Analysis {
  // Geometry is deliberately dimension-invariant: always derive it from the
  // full 8192-point spectrum. The selected dimension only changes the render
  // density downstream, never where a prompt lands.
  const vector = embed(text, 8192)
  const { profile, signed } = profileOf(vector)
  const raw = basisOf().map((basis) => {
    let dot = 0
    for (let i = 0; i < PROFILE_BANDS; i++) dot += signed[i]! * basis[i]!
    return dot
  })
  let projNorm = Math.hypot(raw[0]!, raw[1]!, raw[2]!)
  if (projNorm < 0.000001) {
    const rng = mulberry32(hashString(text, 0x1a2b3c4d))
    raw[0] = rng() * 2 - 1
    raw[1] = rng() * 2 - 1
    raw[2] = rng() * 2 - 1
    projNorm = Math.hypot(raw[0]!, raw[1]!, raw[2]!) || 1
  }
  const axis: [number, number, number] = [raw[0]! / projNorm, raw[1]! / projNorm, raw[2]! / projNorm]
  const tokens = tokenizePrompt(text).length
  const schemeBase = hashString(text, 0x7c3f91b5) % FAMILIES.length
  const magnitude = Math.max(0.35, Math.min(1, 0.35 + projNorm * 1.25))

  return {
    profile,
    signed,
    axis,
    mapX: Math.max(-1, Math.min(1, axis[0] * 1.18)),
    mapY: Math.max(-1, Math.min(1, axis[1] * 1.18)),
    schemeBase,
    magnitude,
    tokens,
  }
}

/** Approximate per-token frames for the roaming mode. */
export function sequenceOf(text: string, dims: EmbeddingDims = 8192): SequenceFrame[] {
  const tokens = tokenizePrompt(text)
  if (tokens.length <= 1) {
    const only = analyze(text, dims)
    return [{ ...only, label: text.trim().slice(0, 12), index: 0 }]
  }
  const meaningful: number[] = []
  for (let i = 0; i < tokens.length; i++) {
    if (/[\p{Script=Han}A-Za-z0-9]/u.test(tokens[i]!)) meaningful.push(i)
  }
  const source = meaningful.length > 1 ? meaningful : tokens.map((_, i) => i)
  const maxFrames = 28
  const indices: number[] = []
  if (source.length <= maxFrames) {
    for (const i of source) indices.push(i)
  } else {
    for (let k = 0; k < maxFrames; k++) {
      indices.push(source[Math.round((k * (source.length - 1)) / (maxFrames - 1))]!)
    }
  }
  return indices.map((tokenIndex, index) => {
    const label = tokens[tokenIndex] ?? ''
    const frame = analyze(windowText(tokens, tokenIndex), dims)
    return { ...frame, label, index }
  })
}

/** A calm synthetic profile for the idle stage, so an empty panel still breathes. */
export function demoProfile(): Float32Array {
  const profile = new Float32Array(PROFILE_BANDS)
  for (let i = 0; i < PROFILE_BANDS; i++) {
    const a = 0.5 + 0.5 * Math.sin(i * 0.115 + 0.4)
    const b = 0.5 + 0.5 * Math.sin(i * 0.047 + 1.7)
    const c = 0.5 + 0.5 * Math.sin(i * 0.23 + 2.9)
    profile[i] = Math.max(0.08, Math.min(1, 0.16 + a * 0.44 + b * 0.3 + c * 0.16))
  }
  return profile
}

/** Stable short label for a prompt. */
export function promptLabel(text: string, max = 34): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= max) return compact
  return `${compact.slice(0, max - 1)}…`
}
