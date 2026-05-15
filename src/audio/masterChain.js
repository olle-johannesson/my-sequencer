/**
 * Creates the master output chain
 *
 * Signal flow:
 *   masterGain ┬→ dryGain ─────────────┐
 *              └→ convolver → wetGain ─┴→ glueComp → limiter → analyser → destination
 *
 * The reverb is a parallel send pre-compressor so the comp glues dry + wet
 * together. Wet gain is intentionally low — this is a sense-of-space tail,
 * not a washy effect.
 */
export function setupMasterBus(audioContext, spectrumSize) {
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.25;

  const dryGain = audioContext.createGain();
  dryGain.gain.value = 1.0;

  const reverb = audioContext.createConvolver();
  reverb.buffer = generateImpulseResponse(audioContext, 1.6, 3.0);

  const wetGain = audioContext.createGain();
  wetGain.gain.value = 0.15;

  const glueComp = audioContext.createDynamicsCompressor();
  glueComp.threshold.value = -20;
  glueComp.knee.value = 8;
  glueComp.ratio.value = 6;
  glueComp.attack.value = 0.004;
  glueComp.release.value = 0.25;

  const limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;

  const outputAnalyser = audioContext.createAnalyser();
  outputAnalyser.fftSize = spectrumSize * 2;

  masterGain.connect(dryGain).connect(glueComp);
  masterGain.connect(reverb).connect(wetGain).connect(glueComp);

  glueComp.connect(limiter)
          .connect(outputAnalyser)
          .connect(audioContext.destination);

  return {
    in: masterGain,
    out: outputAnalyser
  };
}

// Cached IR data so we don't burn ~140k × 2 Math.random + Math.pow ops on
// every start(). Keyed by sample rate (the only thing that actually varies
// in practice — the device-change case re-creates the audio context but
// usually with the same rate). Float-array data is context-agnostic; we
// rebind it onto a fresh AudioBuffer per session.
const irCache = new Map()

/**
 * Synthetic impulse response: stereo white noise with an exponential decay
 * envelope. Cheap, no asset, and tunable: `durationSec` controls tail length,
 * `decay` controls how aggressively the tail falls off (higher = shorter
 * perceived reverb even at the same duration).
 */
function generateImpulseResponse(audioContext, durationSec, decay) {
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * durationSec);
  const cacheKey = `${sampleRate}|${durationSec}|${decay}`
  let cached = irCache.get(cacheKey)
  if (!cached) {
    cached = [new Float32Array(length), new Float32Array(length)]
    for (let ch = 0; ch < 2; ch++) {
      const data = cached[ch]
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    irCache.set(cacheKey, cached)
  }
  const ir = audioContext.createBuffer(2, length, sampleRate);
  ir.copyToChannel(cached[0], 0)
  ir.copyToChannel(cached[1], 1)
  return ir;
}
