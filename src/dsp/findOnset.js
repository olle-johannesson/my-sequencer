export function findOnset(Meyda, samples, sampleRate) {
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