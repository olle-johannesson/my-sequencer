import {loadSample} from "../drums/loadSample.js"
import {bassSamples} from "../drums/bass.js"
import {MINOR_PENTATONIC, pentatonicRates} from "../dsp/pentatonic.js"
import {continuePattern} from "../magentaHelper.js"
import {evenlySpacedPartitions} from "../util/evenlySpacedPartitions.js"
import {DRUM_TO_PITCH} from "../drums/drumNameMaps.js"
import {creepTemperature} from "./creep.js"

// Drum pitches whose onsets we treat as bass-pattern onsets. Kick is the
// core (always); a touch of tom adds occasional accents without flooding
// the bassline.
const KICK_PITCH = DRUM_TO_PITCH.kick
const TOM_PITCHES = new Set([
  DRUM_TO_PITCH.tomLow,
  DRUM_TO_PITCH.tomMid,
  DRUM_TO_PITCH.tomHigh,
])

// Number of ghost kicks injected into the seed before running magenta.
// Reuses the existing patternMutation mechanism: ghost hits nudge the model
// toward elaborating on kick activity in the continuation.
const GHOST_KICK_COUNT = 2

// Bass walks the same pentatonic ladder as the vocal modulation, but the
// rates are picked once per onset at pattern-build time — not at playback.
// The bassline is a fixed 16-step pattern (regenerated every few bars),
// not a continuous random walk.
const BASS_RATES = pentatonicRates({semitonesDown: 7, semitonesUp: 7})

// states:
// 0 = 1
// 1 = ♭3
// 2 = 4
// 3 = 5
// 4 = ♭7

const markovTable = [
  [0.20, 0.15, 0.10, 0.35, 0.20], // from 1
  [0.30, 0.10, 0.25, 0.25, 0.10], // from ♭3
  [0.25, 0.15, 0.10, 0.35, 0.15], // from 4
  [0.40, 0.10, 0.15, 0.15, 0.20], // from 5
  [0.35, 0.20, 0.10, 0.25, 0.10]  // from ♭7
];

// For each Markov state (0..4) — the list of indices into BASS_RATES that
// produce that scale degree. Some degrees appear at multiple octaves
// within the ±7-semitone range (e.g. "4" sits at both -7 and +5); states
// like the root only appear once. Computed once at module load.
const STATE_RATE_INDICES = (() => {
  const indices = MINOR_PENTATONIC.map(() => [])
  BASS_RATES.forEach((rate, idx) => {
    const semitones = Math.round(12 * Math.log2(rate))
    const degreeSemitones = ((semitones % 12) + 12) % 12
    const state = MINOR_PENTATONIC.indexOf(degreeSemitones)
    if (state !== -1) indices[state].push(idx)
  })
  return indices
})()

// Walker state. markovState is the current scale degree (0..4);
// lastBassRate is the actual rate we played, used to break octave ties
// toward nearest-by-pitch motion. Reset by clearAllBass.
let markovState = 0
let lastBassRate = 1.0

function pickMarkovRate() {
  const row = markovTable[markovState]

  // Sample the next state from the row's distribution. Fallback to the
  // last index in case floating-point cumulative falls short of 1.
  const r = Math.random()
  let cumulative = 0
  let nextState = row.length - 1
  for (let i = 0; i < row.length; i++) {
    cumulative += row[i]
    if (r < cumulative) { nextState = i; break }
  }

  // Of all rates that produce this scale degree, pick the one closest in
  // log-pitch to where we just were. Stops the line from leaping octaves
  // every time it lands on a multi-octave degree.
  const candidates = STATE_RATE_INDICES[nextState]
  let bestIdx = candidates[0]
  let bestDist = Math.abs(Math.log2(BASS_RATES[bestIdx] / lastBassRate))
  for (let i = 1; i < candidates.length; i++) {
    const dist = Math.abs(Math.log2(BASS_RATES[candidates[i]] / lastBassRate))
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = candidates[i]
    }
  }

  markovState = nextState
  lastBassRate = BASS_RATES[bestIdx]
  return lastBassRate
}

function resetMarkovWalker() {
  markovState = 0
  lastBassRate = 1.0
}

// Single bass voice — basslines are monophonic, and overlap is handled by
// playMonophonicSampleAt interrupting itself when the buffer reuses.
let currentBassBuffer = null

// One slot per step. `null` = no bass on this step. Otherwise:
// `{buffer, playbackRate}` — the looper hands the playbackRate straight
// through to playSampleAt's modulation parameter.
const scheduledBass = new Array(16).fill(null)
export {scheduledBass as bassPattern}

/**
 * Pick a random bass sample, decode it, and stash it as the current voice.
 * Called from main.js#start, parallel to initDrumPattern.
 */
export async function initBassPattern(audioContext) {
  const loader = bassSamples[Math.floor(Math.random() * bassSamples.length)]
  const mod = await loader()
  currentBassBuffer = await loadSample(audioContext, mod.default ?? mod)
}

/**
 * Regenerate the bass pattern from a fresh set of onsets (typically the
 * kick onsets from the latest magenta drum continuation).
 *
 * **Diff-based pitch update.** Onsets that persisted from the previous
 * pattern keep their previously-assigned playbackRate. Only newly appearing
 * onsets get a freshly-picked rate from `pickPitch`. This is what makes the
 * bassline evolve gradually instead of resetting on every regen — the
 * "main notes" of the line stay anchored while the periphery breathes.
 *
 * `pickPitch` is the single swap point for the pitch-selection strategy:
 *   - default: uniform random over the pentatonic ladder
 *   - later: weighted toward root / fifth
 *   - eventually: Markov chain over scale degrees
 *
 * @param {Iterable<number>} newOnsets — step indices [0..15] where bass should hit
 * @param {() => number} [pickPitch] — returns a playbackRate
 */
export function regenerateBassPattern(newOnsets, pickPitch = pickRandomRate) {
  if (!currentBassBuffer) return

  const previous = [...scheduledBass]
  for (let i = 0; i < scheduledBass.length; i++) scheduledBass[i] = null

  for (const step of newOnsets) {
    scheduledBass[step] = previous[step] ?? {
      buffer: currentBassBuffer,
      playbackRate: pickPitch(),
    }
  }
}

/**
 * Reset both the schedule and the loaded bass buffer. Called from stop().
 * `initBassPattern` will pick a fresh buffer on the next start.
 */
export function clearAllBass() {
  for (let i = 0; i < scheduledBass.length; i++) scheduledBass[i] = null
  currentBassBuffer = null
  resetMarkovWalker()
}

function pickRandomRate() {
  return BASS_RATES[Math.floor(Math.random() * BASS_RATES.length)]
}

/**
 * Seed magenta with the current drum continuation plus a couple of ghost
 * kicks, then extract kick + tom onsets from the result. Same ghost-pitch
 * trick patternMutation uses for sample placement — just aimed at the
 * bass-drum slot.
 *
 * @param {INoteSequence} currentDrumPattern
 * @returns {Promise<number[]>} step indices [0..15], sorted ascending
 */
async function computeBassOnsets(currentDrumPattern) {
  const ghostSteps = evenlySpacedPartitions(GHOST_KICK_COUNT, 16)
  const ghostNotes = ghostSteps.map(stepIndex => ({
    pitch: KICK_PITCH,
    startTime: stepIndex / 16.0,
    endTime: Math.min(stepIndex / 16 + 0.5, 1.0),
    quantizedStartStep: stepIndex,
    quantizedEndStep: stepIndex + 1,
  }))
  const seed = {
    ...currentDrumPattern,
    notes: [...currentDrumPattern.notes, ...ghostNotes],
  }

  const continuation = await continuePattern(seed, creepTemperature())

  const onsets = new Set()
  for (const note of continuation.notes) {
    if (note.pitch === KICK_PITCH || TOM_PITCHES.has(note.pitch)) {
      onsets.add(note.quantizedStartStep)
    }
  }
  return [...onsets].sort((a, b) => a - b)
}

/**
 * One-shot bass-pattern update: pull onsets via magenta + ghost-kick seed,
 * then fold them into the schedule with diff-based pitch retention.
 * Call from main.js#beforeEachCycle on the desired cadence (e.g. every 4
 * bars). Caller passes the current drum pattern from
 * `drumPattern.getCurrentPattern()`.
 */
export async function updateBassPattern(currentDrumPattern, pickPitch = pickMarkovRate) {
  if (!currentDrumPattern) return
  const onsets = await computeBassOnsets(currentDrumPattern)
  regenerateBassPattern(onsets, pickPitch)
}
