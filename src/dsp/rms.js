export function rmsFromSpectrum(spectrum) {
  let sumSq = 0;
  const n = spectrum.length;
  for (let i = 0; i < n; i++) {
    const v = spectrum[i];
    sumSq += v * v;
  }
  return Math.sqrt(sumSq / n);
}
