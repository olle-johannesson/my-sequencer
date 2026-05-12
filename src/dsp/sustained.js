// 20 ms windows give us a reasonable energy snapshot without being so fine
// that natural amplitude wobble (vibrato, breath, room) drags the score down.
const WINDOW_MS = 20

// Windows whose RMS exceeds this fraction of the peak RMS count as "loud".
// 0.3 = roughly -10 dB below peak. Quiet enough to include the body of a
// held note, loud enough to exclude the decay tail.
const LOUD_THRESHOLD = 0.3

// Below this many windows the sample is too short to meaningfully be called
// sustained. 4 × 20 ms = 80 ms — a drum hit plus its decay tail.
const MIN_WINDOWS = 4

/**
 * Score how "sustained" a sample is, 0..1.
 *
 * Splits the sample into ~20 ms windows, computes per-window RMS, and reports
 * the fraction of windows whose RMS is within `LOUD_THRESHOLD` of the peak.
 * A drum hit (loud transient, fast decay) scores low; a held note (loud
 * throughout) scores high.
 *
 * Independent of pitchedness — a sustained noise drone scores high too. The
 * caller combines this with pitch / flatness to decide what musical role the
 * sample should play.
 */
export function sustainedScore(samples, sampleRate) {
  const windowSize = Math.floor(sampleRate * WINDOW_MS / 1000)
  const windowCount = Math.floor(samples.length / windowSize)
  if (windowCount < MIN_WINDOWS) return 0

  // Per-window RMS, plus the peak across windows.
  let peakRms = 0
  const rms = new Float32Array(windowCount)
  for (let i = 0; i < windowCount; i++) {
    const start = i * windowSize
    let sum = 0
    for (let j = 0; j < windowSize; j++) {
      const s = samples[start + j]
      sum += s * s
    }
    const r = Math.sqrt(sum / windowSize)
    rms[i] = r
    if (r > peakRms) peakRms = r
  }
  if (peakRms === 0) return 0

  const threshold = peakRms * LOUD_THRESHOLD
  let above = 0
  for (let i = 0; i < windowCount; i++) if (rms[i] > threshold) above++

  return above / windowCount
}
