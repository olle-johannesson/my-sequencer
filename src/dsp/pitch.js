import { YIN } from 'pitchfinder'

// Number of windows we sample across the buffer to estimate stability. More
// windows = better stability resolution but proportional CPU. 6 is enough to
// catch vibrato / slides while staying cheap (~6 YIN passes per recording).
const STABILITY_WINDOWS = 6

// Per-window size for YIN. 2048 @ 44.1 kHz ≈ 46 ms — enough to resolve down
// to ~22 Hz, well below the lowest musically useful pitch. Power-of-2 so the
// internal autocorrelation FFTs are happy.
const WINDOW_SIZE = 2048

// Cents deviation that maps to a stability score of 0. 100 cents = 1 semitone,
// so anything wider than a semitone of jitter scores as "no stable pitch".
const CENTS_FLOOR = 100

/**
 * Estimate the fundamental pitch of a sample and how stable that pitch is
 * across the body of the sample.
 *
 * Returns `{ pitchHz, pitchStability }`:
 *   - pitchHz: median detected frequency in Hz, or `null` if no window
 *     produced a usable estimate.
 *   - pitchStability: 0..1. 1 = every window agreed within a few cents of
 *     the median. 0 = wild disagreement (or nothing detectable). Combines
 *     pitch-jitter with detection rate, so a sample where only 1 of 6
 *     windows resolved cannot score high.
 *
 * Windows are taken from the inner 15–85% of the buffer so the attack
 * transient and decay tail don't drag the stability score down for samples
 * that are otherwise rock-steady through the body.
 */
export function detectPitch(samples, sampleRate) {
  if (samples.length < WINDOW_SIZE) {
    return { pitchHz: null, pitchStability: 0 }
  }

  const yin = YIN({ sampleRate })

  const innerStart = Math.floor(samples.length * 0.15)
  const innerEnd   = Math.floor(samples.length * 0.85) - WINDOW_SIZE

  // Buffer too short to take multiple windows from the inner region — fall
  // back to a single window at the start and report 0 stability if it lands.
  if (innerEnd <= innerStart) {
    const window = samples.subarray(0, WINDOW_SIZE)
    const p = yin(window)
    return { pitchHz: Number.isFinite(p) && p > 0 ? p : null, pitchStability: 0 }
  }

  const pitches = []
  for (let i = 0; i < STABILITY_WINDOWS; i++) {
    const offset = innerStart + Math.floor((innerEnd - innerStart) * i / (STABILITY_WINDOWS - 1))
    const window = samples.subarray(offset, offset + WINDOW_SIZE)
    const p = yin(window)
    if (Number.isFinite(p) && p > 0) pitches.push(p)
  }

  if (pitches.length === 0) {
    return { pitchHz: null, pitchStability: 0 }
  }

  const sorted = [...pitches].sort((a, b) => a - b)
  const median = sorted[sorted.length >> 1]

  // Mean cents deviation from the median, mapped to a 0..1 tightness score.
  let meanCentsDev = 0
  for (const p of pitches) meanCentsDev += Math.abs(1200 * Math.log2(p / median))
  meanCentsDev /= pitches.length
  const tightness = Math.max(0, 1 - meanCentsDev / CENTS_FLOOR)

  // Penalise samples where only a fraction of windows resolved at all.
  const detectionRate = pitches.length / STABILITY_WINDOWS

  return { pitchHz: median, pitchStability: tightness * detectionRate }
}
