export const presets = {
  small: {
    wet: 0.25,
    rampMs: 40,
    toneLPFHz: 8000,
    convolutionSeconds: 0.3,
    decay: 1.5,
    makeupGain: 3.0,
  },
  medium: {
    wet: 0.90,
    rampMs: 60,
    toneLPFHz: 2500,
    makeupGain: 2.0,
    // decay: 3.0,
    // convolutionSeconds: 1.6
  },
};

function makeIRBuffer(audioCtx, seconds = 1.2, decay = 2.5) {
  const rate = audioCtx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const ir = audioCtx.createBuffer(2, length, rate);

  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, decay);
      data[i] = (Math.random() * 2 - 1) * env;
    }
  }
  return ir;
}

export function createReverbChain(audioCtx) {
  const input = audioCtx.createGain();
  const dry = audioCtx.createGain();
  const wet = audioCtx.createGain();
  const output = audioCtx.createGain();

  const tone = audioCtx.createBiquadFilter();
  tone.type = "lowpass";

  const convolver = audioCtx.createConvolver();
  convolver.buffer = makeIRBuffer(audioCtx, 1.2, 2.8);

  // wiring
  // input.connect(dry).connect(output);
  input.connect(convolver).connect(tone).connect(wet).connect(output);

  // defaults
  dry.gain.value = 1.0;
  wet.gain.value = 0.0;
  tone.frequency.value = 20_000;
  output.gain.value = 1.0;

  let connected = false;
  let lastIn = null;
  let lastOut = null;

  function applyPreset(p, t) {
    const ramp = Math.max(0.001, (p.rampMs ?? 40) / 1000);

    console.log(t, ramp)

    tone.frequency.setValueAtTime(p.toneLPFHz ?? 1000, t);
    tone.frequency.linearRampToValueAtTime(p.toneLPFHz ?? 1000, t + ramp);

    if (p.convolutionSeconds && p.decay) {
      convolver.buffer = makeIRBuffer(audioCtx, p.convolutionSeconds, p.decay);
    }

    output.gain.setValueAtTime(p.makeupGain ?? 1.0, t);

    // ramp FROM current wet (don't reset)
    wet.gain.cancelScheduledValues(t);
    wet.gain.setValueAtTime(wet.gain.value, t);
    wet.gain.linearRampToValueAtTime(p.wet ?? 0.25, t + ramp);

    dry.gain.cancelScheduledValues(t)
    dry.gain.setValueAtTime(dry.gain.value + 0.3, t);
    dry.gain.linearRampToValueAtTime(1.0 - wet.gain.value, t + 0.03);

    // only auto-off if dur is explicitly provided (hit)
    if (p.dur != null) {
      wet.gain.linearRampToValueAtTime(0.0, t + p.dur);
    }
  }

  function connect(config = {}) {
    const t = config.t ?? audioCtx.currentTime;
    const p =
      typeof config === "string"
        ? presets[config]
        : config ?? presets.smallHit;

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

    // Fade out wet signal
    wet.gain.cancelScheduledValues(t);
    wet.gain.setValueAtTime(wet.gain.value, t);
    wet.gain.linearRampToValueAtTime(0.0, t + 0.03);

    setTimeout(() => {
      try { lastIn.disconnect(input); } catch {}
      try { output.disconnect(lastOut); } catch {}
      connected = false;
      lastIn = null;
      lastOut = null;
    }, 35);
  }

  return { connect, disconnect, nodes: { input, convolver, tone, dry, wet, output } };
}
