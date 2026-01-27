export function makeDriveCurve(amount = 0.0, n = 1024) {
  // amount: 0..1-ish
  const curve = new Float32Array(n);

  if (amount < 0.01) {
    // Clean - straight line
    for (let i = 0; i < n; i++) {
      curve[i] = (i * 2) / (n - 1) - 1;
    }
    return curve;
  }

  // Classic overdrive: pre-gain → soft clip → post-attenuation
  const preGain = 1 + amount * 20;  // How much we boost before clipping
  const postGain = 1 / (1 + amount * 2);  // Compensate output level

  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    const driven = x * preGain;

    // Simple soft clipping with atan
    const clipped = (2 / Math.PI) * Math.atan(driven);
    curve[i] = clipped * postGain;
  }

  return curve;
}
