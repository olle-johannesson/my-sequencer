export const presets = {
  slapback: {
    delayTime: 0.11,
    feedback: 0.22,
    fbLPFHz: 7000,
    wet: 0.28,
    wetRampMs: 15,
  },

  dub: {
    delayTime: 0.22,
    feedback: 0.68,
    fbLPFHz: 3200,
    wet: 0.45,
    wetRampMs: 15,
  },

  selfOsc: {
    delayTime: 0.24,
    feedback: 0.84,
    fbLPFHz: 2500,
    wet: 0.55,
    wetRampMs: 10,
  },
};

export function createDelayChain(audioCtx) {
  const input = audioCtx.createGain();
  const dry = audioCtx.createGain();
  const wet = audioCtx.createGain();
  const output = audioCtx.createGain();

  const delay = audioCtx.createDelay(1.0);
  const fbGain = audioCtx.createGain();
  const fbFilter = audioCtx.createBiquadFilter();
  fbFilter.type = "lowpass";

  // dry path
  input.connect(dry).connect(output);

  // wet path
  input.connect(delay).connect(wet).connect(output);

  // feedback loop: delay -> fbGain -> fbFilter -> delay
  delay.connect(fbGain).connect(fbFilter).connect(delay);

  // defaults
  dry.gain.value = 1.0;
  wet.gain.value = 0.0;
  delay.delayTime.value = 0.2;
  fbGain.gain.value = 0.6;
  fbFilter.frequency.value = 4000;
  output.gain.value = 1.0;

  let connected = false;
  let lastIn = null;
  let lastOut = null;

  function applyPreset(p, t) {
    const ramp = Math.max(0.001, (p.wetRampMs ?? 10) / 1000);

    delay.delayTime.setValueAtTime(p.delayTime ?? 0.22, t);
    fbGain.gain.setValueAtTime(p.feedback ?? 0.6, t);
    fbFilter.frequency.setValueAtTime(p.fbLPFHz ?? 4000, t);
    wet.gain.cancelScheduledValues(t);
    wet.gain.setValueAtTime(wet.gain.value, t);
    wet.gain.linearRampToValueAtTime(p.wet ?? 0.4, t + ramp);
  }

  function connect(config = {}) {
    const t = config.t ?? audioCtx.currentTime;
    const p = typeof config === "string"
        ? presets[config]
        : config ?? presets.dubThrow;

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
    try { lastIn.disconnect(input); } catch {}
    try { output.disconnect(lastOut); } catch {}
    connected = false;
    lastIn = null;
    lastOut = null;
    wet.gain.cancelScheduledValues(t);
  }

  return { connect, disconnect, nodes: { input, delay, fbGain, fbFilter, dry, wet, output } };
}
