export function makeDriveCurve(amount = 0.0, n = 1024) {
  // amount: 0..1-ish
  const k = 1 + amount * 50;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}
