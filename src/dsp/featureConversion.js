export function hpfFreqFromCentroid(centroidHz, settings = {}) {
  const centroid = Math.max(0, centroidHz || 0);
  const norm = Math.min(1, centroid / 4000); // crude
  const hpMin = settings.hpMin ?? 80;
  const hpMax = settings.hpMax ?? 300;
  const baseHp =  hpMin + norm * (hpMax - hpMin);

  if (settings.flatness !== undefined) {
    const flat = settings.flatness || 0;
    const noisyBoost = flat * 100; // 0..100 Hz
    return baseHp + noisyBoost;
  }

  return baseHp;
}

export function gainFromRms(rms, settings = {}) {
  const rmsMax = settings.rmsMax ?? 1e-6
  const targetRms = settings.targetRms ?? 0.07;
  const gainMin = settings.minGain ?? 0.25;
  const gainMax = settings.maxGain ?? 4.0;

  const clampedRms = Math.max(rms, rmsMax);
  let rawGain = targetRms / clampedRms;
  return Math.max(gainMin, Math.min(gainMax, rawGain));
}



