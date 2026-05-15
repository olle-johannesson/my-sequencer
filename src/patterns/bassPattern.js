import {loadSample} from "../drums/loadSample.js"
import {bassSamples} from "../drums/bass.js"
import {MINOR_PENTATONIC, pentatonicRates} from "../dsp/pentatonic.js"
import {continuePattern} from "../magentaHelper.js"
import {evenlySpacedPartitions} from "../util/evenlySpacedPartitions.js"
import {DRUM_TO_PITCH} from "../drums/drumNameMaps.js"
import {creepTemperature} from "./creep.js"
import {binIndex} from "../util/bins.js";
import {getNormallyDistributedNumber} from "../util/random.js"
import {audioConfig, STEPS_PER_BAR} from "../config.js"

// Drum pitches whose onsets we treat as bass-pattern onsets. Kick is the
// core; toms add occasional accents without flooding the bassline.
const KICK_PITCH = DRUM_TO_PITCH.kick
const BASS_LIKE_DRUM_PITCHES = new Set([
  KICK_PITCH,
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

function pickMarkovRate(prevRate) {
  const prevState = rateToState(prevRate)
  const nextState = binIndex(markovTable[prevState], Math.random())
  const candidateRates = STATE_RATE_INDICES[nextState].map(idx => BASS_RATES[idx])
  return nearestInLogPitch(candidateRates, prevRate)
}

// Inverse of the table-construction step: a rate maps back to its scale
// degree index. Octave-fold to mod 12 so e.g. -7 semitones (low fifth)
// and +5 semitones (high fourth — different rate, same degree as ±5)
// land on their own state. Defensive fallback to root for any rate that
// isn't on the pentatonic grid.
function rateToState(rate) {
  const semitones = Math.round(12 * Math.log2(rate))
  const degreeSemitones = ((semitones % 12) + 12) % 12
  const state = MINOR_PENTATONIC.indexOf(degreeSemitones)
  return state === -1 ? 0 : state
}

// A scale degree may live at more than one octave within BASS_RATES — e.g.
// "4" appears at both -7 and +5 semitones from the root. When the Markov
// walker lands on such a degree, pick whichever octave is closest to the
// previously played rate, measured in log-pitch (so octave distance is
// constant regardless of where on the scale we are). Keeps the line
// walking smoothly instead of leaping every time it crosses a multi-
// octave note.
const logDistance = (a, b) => Math.abs(Math.log2(a / b))
function nearestInLogPitch(rates, fromRate) {
  return rates.reduce((a, b) =>
    logDistance(a, fromRate) <= logDistance(b, fromRate) ? a : b
  )
}

// Single bass voice — basslines are monophonic, and overlap is handled by
// playMonophonicSampleAt interrupting itself when the buffer reuses.
let currentBassBuffer = null

// One slot per step. `null` = no bass on this step. Otherwise:
// `{buffer, playbackRate}` — the looper hands the playbackRate straight
// through to playSampleAt's modulation parameter.
const scheduledBass = new Array(STEPS_PER_BAR).fill(null)
export {scheduledBass as bassPattern}

// Pre-computed bass pattern, ready to promote on the next regen tick.
// Same buffering trick `updateDrumPattern` uses: promote synchronously,
// then start the next magenta call. Keeps the bar boundary unblocked.
let nextBassPattern = null

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
 * Reset the schedule, the buffered next pattern, and the loaded bass
 * buffer. Called from stop(). `initBassPattern` will pick a fresh buffer
 * on the next start.
 */
export function clearAllBass() {
  for (let i = 0; i < scheduledBass.length; i++) scheduledBass[i] = null
  nextBassPattern = null
  currentBassBuffer = null
}

/**
 * Curried scheduler for the looper's `scheduleBass` callback. The caller
 * supplies the `play` function — wire a monophonic one here so overlapping
 * bass notes cross-fade rather than stack. Pitch (playbackRate) is baked
 * into the bass entry at pattern-build time, not picked at playback.
 */
export const scheduleAt = (audioContext, outputNode, play) => (time, bassEntry, stepGain) => {
  const gain = audioConfig.baseGain * stepGain + getNormallyDistributedNumber(0, audioConfig.humanFactor.bass)
  const {buffer, playbackRate} = bassEntry
  play(audioContext, buffer, time, gain, outputNode, {playbackRate})
}

/**
 * Continue a drum pattern through magenta, but inject a few evenly-spaced
 * ghost kicks into the seed first so the continuation tends to elaborate
 * on kick activity. Same ghost-pitch trick patternMutation uses for sample
 * placement, aimed at the bass-drum slot here.
 *
 * @param {INoteSequence} seedDrumPattern
 * @returns {Promise<INoteSequence>}
 */
async function continueDrumPatternWithGhostKicks(seedDrumPattern) {
  const ghostNotes = evenlySpacedPartitions(GHOST_KICK_COUNT, STEPS_PER_BAR).map(step => ({
    pitch: KICK_PITCH,
    startTime: step / STEPS_PER_BAR,
    endTime: Math.min(step / STEPS_PER_BAR + 0.5, 1.0),
    quantizedStartStep: step,
    quantizedEndStep: step + 1,
  }))
  return continuePattern({
    ...seedDrumPattern,
    notes: [...seedDrumPattern.notes, ...ghostNotes],
  }, creepTemperature())
}

/**
 * Step indices in `drumPattern` where any of `pitches` plays. Sorted
 * ascending, deduplicated.
 *
 * @param {INoteSequence} drumPattern
 * @param {Set<number>} pitches
 * @returns {number[]}
 */
function extractOnsets(drumPattern, pitches) {
  const onsets = new Set()
  for (const note of drumPattern.notes) {
    if (pitches.has(note.pitch)) onsets.add(note.quantizedStartStep)
  }
  return [...onsets].sort((a, b) => a - b)
}

/**
 * Decide the bass note for `step`, given the previous bass pattern and
 * the rate that's playing just before this position in the new line.
 *
 * Persistence: if the seed already had a bass note at this step, reuse
 * it verbatim — pitch and buffer carry over. This is what keeps the
 * bassline coherent across regens; only the freshly appearing onsets
 * get new pitches rolled.
 *
 * @param {number} step
 * @param {Array<{buffer: AudioBuffer, playbackRate: number} | null>} seedBassPattern
 * @param {number} prevRate — rate of the most recent placed bass note
 */
function pitchOnsetWithContext(step, seedBassPattern, prevRate) {
  return seedBassPattern[step] ?? {
    buffer: currentBassBuffer,
    playbackRate: pickMarkovRate(prevRate),
  }
}

// The bass note playing right before the bar boundary (wraparound from
// the seed pattern's tail). Used as the starting prevRate for the new
// regen so the Markov walker sees genuine line continuity instead of
// resetting to root every 4 bars.
function lastPlayedRate(pattern) {
  for (let i = pattern.length - 1; i >= 0; i--) {
    if (pattern[i]) return pattern[i].playbackRate
  }
  return 1.0
}

/**
 * Compute one bass-pattern regen as pure-ish data.
 *
 *   1. Continue the drum pattern (with kick bias) — gives us a fresh
 *      INoteSequence of where things might hit.
 *   2. Extract the onsets at bass-like drum pitches.
 *   3. For each onset, decide its pitch in the context of the seed
 *      bass pattern (persistent onsets keep their pitch, new ones roll).
 *
 * Doesn't mutate module state apart from advancing the Markov walker
 * inside `pitchOnsetWithContext`. Returns the new pattern as a plain
 * array.
 *
 * @param {INoteSequence} seedDrumPattern
 * @param {Array<{buffer: AudioBuffer, playbackRate: number} | null>} seedBassPattern
 * @returns {Promise<Array<{buffer: AudioBuffer, playbackRate: number} | null>>}
 */
async function computeNextBassPattern(seedDrumPattern, seedBassPattern) {
  const drumContinuation = await continueDrumPatternWithGhostKicks(seedDrumPattern)
  const onsets = extractOnsets(drumContinuation, BASS_LIKE_DRUM_PITCHES)
  const next = new Array(STEPS_PER_BAR).fill(null)
  let prevRate = lastPlayedRate(seedBassPattern)
  for (const step of onsets) {
    next[step] = pitchOnsetWithContext(step, seedBassPattern, prevRate)
    prevRate = next[step].playbackRate
  }
  return next
}

/**
 * Promote the previously-computed pattern to the live schedule, then
 * pre-compute the *next* one for the following regen.
 *
 * The promotion is synchronous so the new pattern is visible to the
 * looper before the magenta call starts. The `await` lands as the last
 * statement, so this function returns control to `beforeEachCycle` only
 * after the bar boundary has been crossed — magenta inference can take
 * its time without delaying the bar.
 *
 * On the very first call there's no buffered pattern yet, so we compute
 * one inline. Subsequent calls take the buffered one for free.
 *
 * @param {INoteSequence} seedDrumPattern
 */
export async function updateBassPattern(seedDrumPattern) {
  if (!seedDrumPattern || !currentBassBuffer) return

  if (!nextBassPattern) {
    nextBassPattern = await computeNextBassPattern(seedDrumPattern, scheduledBass)
  }

  for (let i = 0; i < scheduledBass.length; i++) scheduledBass[i] = nextBassPattern[i]

  nextBassPattern = await computeNextBassPattern(seedDrumPattern, scheduledBass)
}
