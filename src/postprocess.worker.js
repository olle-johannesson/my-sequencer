import Meyda from "meyda"

self.onmessage = (e) => {
  const { type, samples, sampleRate } = e.data;
  if (type !== 'processRecording') return;

  const float = new Float32Array(samples); // copy so we can keep it immutable upstream

  const onsetIndex = findOnset(float, sampleRate);
  const tailIndex  = float.length //findTail(float, sampleRate); // or just use float.length

  // Make a trimmed view: [onsetIndex, tailIndex)
  const trimmedView = float.subarray(onsetIndex, tailIndex);

  // Copy to a new array we’ll modify with envelope:
  const processed = new Float32Array(trimmedView.length);
  processed.set(trimmedView);

  applyEnvelope(processed, sampleRate);

  self.postMessage({ type: 'processedRecording', samples: processed, sampleRate }, [processed.buffer]);
};

function findOnset(samples, sampleRate) {
  const frameSize = 1024;
  const hopSize   = 512;

  const fluxes = [];
  let maxFlux = 0;

  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    const frame = samples.subarray(start, start + frameSize);
    const res = Meyda.extract('spectralFlux', frame, { sampleRate });
    const flux = res || 0;
    fluxes.push(flux);
    if (flux > maxFlux) maxFlux = flux;
  }

  if (fluxes.length === 0) return 0;

  // Simple threshold: first frame above some fraction of maxFlux
  const threshold = maxFlux * 0.3; // tweakable (0.2–0.4 ish)

  let onsetFrame = 0;
  for (let i = 0; i < fluxes.length; i++) {
    if (fluxes[i] >= threshold) {
      onsetFrame = i;
      break;
    }
  }

  const onsetSample = onsetFrame * hopSize;
  return Math.max(0, Math.min(onsetSample, samples.length - 1));
}

function applyEnvelope(buf, sampleRate, attackMs = 3, maxDecayMs = 300) {
  const n = buf.length;
  if (n === 0) return;

  const attackSamples = Math.min(Math.floor(sampleRate * attackMs / 1000), n);

  // Compute rough tail RMS on last 20% of the sample
  const tailStart = Math.floor(n * 0.8);
  let sumSq = 0, count = 0;
  for (let i = tailStart; i < n; i++) {
    const v = buf[i];
    sumSq += v * v;
    count++;
  }
  const tailRms = count > 0 ? Math.sqrt(sumSq / count) : 0;

  // Decide how aggressive the decay should be:
  // - quiet natural tail -> short fade
  // - loud flat tail     -> longer fade
  const targetTailDb = -40;
  const tailDb = tailRms > 0 ? 20 * Math.log10(tailRms) : -Infinity;

  // Map how "too loud" the tail is to a decay length
  const loudnessOver = Math.max(0, targetTailDb - tailDb); // negative -> 0
  const t = Math.min(loudnessOver / 20, 1); // clamp 0..1 over 20dB
  const decayMs = 80 + t * (maxDecayMs - 80); // between 80ms and maxDecayMs

  const decaySamples = Math.min(Math.floor(sampleRate * decayMs / 1000), n);
  const decayStart = Math.max(n - decaySamples, attackSamples);

  // Apply attack
  for (let i = 0; i < attackSamples; i++) {
    const env = i / attackSamples;
    buf[i] *= env;
  }

  // Hold between attack and decayStart (env ~ 1)

  // Apply decay (linear; you can also make this exponential if you like)
  const denom = n - decayStart || 1;
  for (let i = decayStart; i < n; i++) {
    const frac = (i - decayStart) / denom;
    const env = 1 - frac;
    buf[i] *= env;
  }
}