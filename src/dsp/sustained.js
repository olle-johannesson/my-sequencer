// 2048 samples ≈ 46 ms at 44.1k — same scale as the YIN windows in
// pitch.js. Power-of-two so Meyda's internal FFT is happy.
const WINDOW_SIZE = 2048

// Number of windows to sample across the body. More = tighter estimate
// at proportional FFT cost. 5 matches the resolution we use for pitch
// stability and keeps the per-recording extraction cheap.
const FLATNESS_WINDOWS = 5

/**
 * "Is this a tonal sound (a pitched / sustained tone) or a noisy /
 * percussive one?" — orthogonal to pitchStability, which measures how
 * much that pitch wanders over time.
 *
 * Computes spectral flatness over windows from the inner 15–85% of the
 * buffer, then returns `1 - mean(flatness)`. Low flatness means the
 * spectrum is peaky (a few strong partials — what a tone looks like).
 * High flatness means white-noise-like (energy spread evenly — what a
 * snare or breath or hiss looks like).
 *
 * Attack transients are skipped because even pure tones have noisy
 * onsets; what we care about is what the body of the sound looks like.
 *
 *   clean whistle  → ~0.95
 *   sung note      → ~0.85
 *   bowed string   → ~0.85
 *   tom hit        → ~0.50  (some periodic content + a lot of noise)
 *   snare          → ~0.20
 *   hihat / hiss   → ~0.05
 *
 * @param {Float32Array} samples
 * @param {number} sampleRate
 * @param {object} Meyda
 * @returns {number} 0..1; 1 = pure tone, 0 = white noise
 */
export function sustainedScore(samples, sampleRate, Meyda) {
  if (samples.length < WINDOW_SIZE) return 0

  const innerStart = Math.floor(samples.length * 0.15)
  const innerEnd   = Math.floor(samples.length * 0.85) - WINDOW_SIZE

  // Buffer too short to take multiple windows from the body — fall back
  // to a single window from the start. Less reliable but better than 0.
  if (innerEnd <= innerStart) {
    const flatness = extractFlatness(Meyda, samples.subarray(0, WINDOW_SIZE))
    return flatness == null ? 0 : Math.max(0, 1 - flatness)
  }

  let sum = 0
  let count = 0
  for (let i = 0; i < FLATNESS_WINDOWS; i++) {
    const offset = innerStart + Math.floor((innerEnd - innerStart) * i / (FLATNESS_WINDOWS - 1))
    const flatness = extractFlatness(Meyda, samples.subarray(offset, offset + WINDOW_SIZE))
    if (flatness != null) {
      sum += flatness
      count++
    }
  }
  if (count === 0) return 0
  return Math.max(0, 1 - sum / count)
}

function extractFlatness(Meyda, window) {
  const r = Meyda.extract(['spectralFlatness'], window)
  return Number.isFinite(r?.spectralFlatness) ? r.spectralFlatness : null
}
