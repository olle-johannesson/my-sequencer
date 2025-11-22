export function normalizeRMS(samples, targetDb = -20, peakLimitDb = -1) {
  const targetRMS = Math.pow(10, targetDb / 20);      // e.g. -20 dB
  const peakLimit = Math.pow(10, peakLimitDb / 20);   // e.g. -1 dB

  let sumSq = 0;
  let maxAbs = 0;

  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sumSq += v * v;
    const a = Math.abs(v);
    if (a > maxAbs) maxAbs = a;
  }

  if (samples.length === 0 || sumSq === 0) return samples;

  const rms = Math.sqrt(sumSq / samples.length);

  // scale factor needed to hit target RMS
  const rmsScale = targetRMS / rms;

  // scale factor needed to keep peaks under peakLimit
  const peakScale = maxAbs > 0 ? peakLimit / maxAbs : Infinity;

  // choose the smaller one so we respect both constraints
  const scale = Math.min(rmsScale, peakScale);

  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] * scale;
  }

  return out;
}