import {makeDriveCurve} from "../util/driveCurve.js";

export const presets = {
  distort: {
    filter: {
      type: 'lowpass',
      Q: 0.7,
      baseHz: 8000,  // Static high cutoff
      depthHz: 0,     // No modulation - pure distortion
      rateHz: 0.1,
    },
    drive: { amount: 0.85 },  // Heavy drive for aggressive distortion
    outGain: 1.0,
  },

  bandDrift: {
    filter: {
      type: 'bandpass',
      Q: 8,
      baseHz: 1200,
      depthHz: 900,
      rateHz: 0.37,
    },
    drive: { amount: 0.15 },
    outGain: 1.0,
  },

  lpWobble: {
    filter: {
      type: 'lowpass',
      Q: 0.9,
      baseHz: 1800,
      depthHz: 1400,
      rateHz: 0.29,
    },
    drive: { amount: 0.12 },
    outGain: 1.0,
  },
};

export function createFilterDriveChain(audioCtx) {
  const input = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  const drive = audioCtx.createWaveShaper();
  const output = audioCtx.createGain();

  // audio path
  input.connect(filter);
  filter.connect(drive);
  drive.connect(output);

  // defaults
  filter.type = 'bandpass';
  filter.Q.value = 1;
  filter.frequency.value = 12000; // neutral open
  drive.curve = makeDriveCurve(0);
  drive.oversample = '2x';
  output.gain.value = 1;

  // --- LFO (simple-as-pie) ---
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();

  lfo.type = 'sine';
  lfo.frequency.value = 0.3; // Hz
  lfoGain.gain.value = 0;    // depth in Hz (0 = off)

  // LFO → filter cutoff
  lfo.connect(lfoGain).connect(filter.frequency);

  let lfoStarted = false;
  function startLfo(t) {
    if (!lfoStarted) {
      lfo.start(t);
      lfoStarted = true;
    }
  }

  let connected = false;
  let lastIn = null;
  let lastOut = null;

  function applyPreset(p, t) {
    startLfo(t);

    // filter shape
    filter.type = p.filter.type;
    filter.Q.setValueAtTime(p.filter.Q ?? 1, t);

    // base cutoff (DC value)
    filter.frequency.setValueAtTime(Math.max(1, p.filter.baseHz), t);

    // LFO params
    lfo.frequency.setValueAtTime(Math.max(0.01, p.filter.rateHz), t);
    lfoGain.gain.setValueAtTime(Math.max(0, p.filter.depthHz), t);

    // drive
    drive.curve = makeDriveCurve(p.drive?.amount ?? 0);

    // output trim
    output.gain.setValueAtTime(p.outGain ?? 1, t);
  }

  function connect(config = {}) {
    const t = config.t ?? audioCtx.currentTime;
    const preset =
      typeof config === "string"
        ? presets[config]
        : config.preset ?? config;

    if (!connected) {
      lastIn = config.in;
      lastOut = config.out;
      config.in.connect(input);
      output.connect(config.out);
      connected = true;
    }

    applyPreset(preset, t);
  }

  function disconnect(t = audioCtx.currentTime) {
    if (!connected) return;

    // turn modulation OFF, not oscillator
    lfoGain.gain.setValueAtTime(0, t);

    // reset to neutral
    filter.frequency.setValueAtTime(12000, t);
    filter.Q.setValueAtTime(1, t);

    try { lastIn.disconnect(input); } catch {}
    try { output.disconnect(lastOut); } catch {}

    connected = false;
    lastIn = null;
    lastOut = null;
  }

  return {
    connect,
    disconnect,
    nodes: { input, filter, drive, lfo, lfoGain, output },
  };
}
