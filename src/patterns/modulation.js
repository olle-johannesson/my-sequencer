import {getNormallyDistributedNumber} from '../util/random.js'
import {pentatonicRates} from '../dsp/pentatonic.js'

// Random-walk step size (stddev of the per-call jump). ~1.0 keeps most
// jumps at ±1 scale step with the occasional ±2..3 — wide enough to feel
// like a melody, tight enough to not feel scrambled. No slider — this is
// a feel knob, not user-facing.
const WALK_STDDEV = 1.0

// Per-buffer walker state. Keyed by AudioBuffer so the *same sample*
// placed at multiple pattern steps shares one cursor — successive hits
// walk a single line through the scale instead of each step picking
// independently. Entries GC with the buffer.
const stateByBuffer = new WeakMap()

/**
 * Build a modulation table for a sustained pitched buffer.
 *
 * The buffer is chopped into N evenly-spaced slices (one per scale tone),
 * and each entry pairs a slice's `(offset, duration)` with a pentatonic
 * `playbackRate`. Cursor starts at unison so the first hit plays at the
 * detected natural pitch.
 *
 * @param {AudioBuffer} buffer
 * @returns {{entries: {offset: number, duration: number, playbackRate: number}[], cursor: number}}
 */
export function buildModulationTable(buffer) {
  const rates = pentatonicRates({octavesDown: 1, octavesUp: 1})
  const sliceLength = buffer.duration / rates.length
  const entries = rates.map((playbackRate, i) => ({
    offset: i * sliceLength,
    duration: sliceLength,
    playbackRate,
  }))
  // rates are sorted ascending and include 1.0 (unison) somewhere in the
  // middle of the array — start the cursor there so first playback is at
  // the recorded sample's natural pitch.
  const cursor = Math.max(0, entries.findIndex(e => e.playbackRate === 1))
  return {entries, cursor}
}

/**
 * Associate a modulation table with a buffer. Subsequent
 * `nextModulation(buffer)` calls consult it.
 */
export function setModulation(buffer, table) {
  stateByBuffer.set(buffer, table)
}

/**
 * Advance the walker by one normally-distributed jump on the scale ring
 * and return the picked entry. Returns `undefined` for buffers without a
 * registered table — drums, percussive samples — so the caller can default
 * to natural-rate full-buffer playback.
 *
 * @param {AudioBuffer} buffer
 * @returns {{offset: number, duration: number, playbackRate: number} | undefined}
 */
export function nextModulation(buffer) {
  const state = stateByBuffer.get(buffer)
  if (!state) return undefined
  const jump = Math.round(getNormallyDistributedNumber(0, WALK_STDDEV))
  const len = state.entries.length
  state.cursor = ((state.cursor + jump) % len + len) % len
  return state.entries[state.cursor]
}

/**
 * Drop the modulation for a buffer. Strictly optional — the WeakMap lets
 * entries GC with the buffer — but useful when a sample is explicitly
 * retired and you want the cursor to reset if it ever comes back.
 */
export function clearModulation(buffer) {
  stateByBuffer.delete(buffer)
}
