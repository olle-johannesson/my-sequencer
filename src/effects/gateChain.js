export const presets = {
  // classic trem/gate
  stutter8:  { rateHz: 8.0, duty: 0.12, depth: 1.0, smoothMs: 0, outGain: 1.0 },
  // stutter8:  { rateHz: 2.0,  duty: 0.25, depth: 1.0, smoothMs: 2, outGain: 1.0 },
  stutter16: { rateHz: 4.0, duty: 0.20, depth: 1.0, smoothMs: 2, outGain: 1.0 },

  // extreme: very obviously gating
  hardGate:  { rateHz: 7.0,  duty: 0.12, depth: 1.0, smoothMs: 1, outGain: 1.0 },
  // more “burst” / uneven feel
  bursty:     { rateHz: 16.0, duty: 0.35, depth: 1.0, smoothMs: 1, outGain: 1.0 },
  // triplet-ish vibe (unsynced by default; you can tune rate)
  tripletish: { rateHz: 9.0,  duty: 0.45, depth: 1.0, smoothMs: 2, outGain: 1.0 },
  // PO-ish: slightly off-grid drift
  driftGate:  { rateHz: 7.3,  duty: 0.50, depth: 1.0, smoothMs: 2, outGain: 1.0 },
};

// helper: waveshaper that turns sine into a gate-ish square (with adjustable duty)
function makeGateCurve(duty = 0.5, n = 1024, edge = 0.02) {
  const threshold = 1 - 2 * duty; // -1..1
  const curve = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;

    // soft step around threshold (edge controls transition width)
    const a = (x - threshold) / edge;
    const y = 0.5 + 0.5 * Math.tanh(a); // 0..1
    curve[i] = y;
  }
  return curve;
}

export function createGateChain(audioCtx) {
  const input = audioCtx.createGain();
  const gate = audioCtx.createGain();
  gate.gain.value = 0.0;

  const output = audioCtx.createGain();
  output.gain.value = 1.0;

  const lfo = audioCtx.createOscillator();
  const shaper = audioCtx.createWaveShaper();
  const depth = audioCtx.createGain();
  const floor = audioCtx.createConstantSource();


  lfo.type = "sine";
  lfo.frequency.value = 8.0;
  shaper.curve = makeGateCurve(0.5);
  depth.gain.value = 1.0;
  floor.offset.value = 0.0;

  input.connect(gate).connect(output);
  lfo.connect(shaper).connect(depth).connect(gate.gain);
  // floor.connect(gate.gain);
  // floor.start();
  lfo.start();

  let connected = false;
  let lastIn = null;
  let lastOut = null;

  function applyPreset(p, t) {
    lfo.frequency.setValueAtTime(p.rateHz, t);
    shaper.curve = makeGateCurve(p.duty);
    depth.gain.setValueAtTime(p.depth ?? 1.0, t);
    floor.offset.setValueAtTime(p.floor ?? 0.0, t); // 0 = true silence when closed
  }

  function connect(config = {}) {
    const t = config.t ?? audioCtx.currentTime;

    const p = typeof config === "string"
      ? presets[config]
      : config ?? presets.stutter16;

    if (!connected) {
      lastIn = config.in;
      lastOut = config.out;
      config.in.connect(input);
      output.connect(config.out);
      connected = true;
    }

    applyPreset(p, t);
  }

  function disconnect(t = audioCtx.currentTime) {
    if (!connected) return;

    // fully open: depth off, floor = 1
    depth.gain.setValueAtTime(0.0, t);
    floor.offset.setValueAtTime(1.0, t);

    try { lastIn.disconnect(input); } catch {}
    try { output.disconnect(lastOut); } catch {}
    connected = false;
    lastIn = null;
    lastOut = null;
  }

  return {
    connect,
    disconnect,
    nodes: { input, gate, output, lfo, shaper, depth },
  };
}

