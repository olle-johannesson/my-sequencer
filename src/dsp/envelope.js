export function applyEnvelope(buf, sampleRate, attackMs = 3, maxDecayMs = 300) {
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
