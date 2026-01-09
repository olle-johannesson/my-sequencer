// chains/grainChain.js

export const presets = {
  // HOLD-style, musical defaults (repeat interval in ms)
  beatRepeat: {
    wet: 1.0,
    windowMs: 175,
    repeatMs: 200,   // ~8 Hz
    jitterMs: 0,
    reverse: 0,
    rampMs: 8,
    duckDry: 1.0,
    outGain: 1.0,
  },

  glitchStretch: {
    wet: 1.0,
    windowMs: 140,
    repeatMs: 200,   // ~5 Hz
    jitterMs: 18,
    reverse: 0,
    rampMs: 10,
    duckDry: 0.9,
    outGain: 1.0,
  },

  reverseWindow: {
    wet: 1.0,
    windowMs: 175,
    repeatMs: 175,   // repeat the whole window
    jitterMs: 0,
    reverse: 1,
    rampMs: 8,
    duckDry: 1.0,
    outGain: 1.0,
  },

  vinylJitter: {
    wet: 0.75,
    windowMs: 12,
    repeatMs: 42,    // ~24 Hz
    jitterMs: 4,
    reverse: 0,
    rampMs: 12,
    duckDry: 0.6,
    outGain: 1.0,
  },
};

export function createGrainChain(audioCtx) {
  const input = audioCtx.createGain();

  const dry = audioCtx.createGain();
  const wetGain = audioCtx.createGain();
  const output = audioCtx.createGain();

  const grain = new AudioWorkletNode(audioCtx, "grain-player", {
    parameterData: {
      wet: 0.0,
      windowMs: 40,
      repeatMs: 80,   // ✅ changed
      jitterMs: 0,
      reverse: 0,
    },
  });

  input.connect(dry).connect(output);
  input.connect(grain).connect(wetGain).connect(output);

  dry.gain.value = 1.0;
  wetGain.gain.value = 1.0;
  output.gain.value = 1.0;

  const pWet      = grain.parameters.get("wet");
  const pWindowMs = grain.parameters.get("windowMs");
  const pRepeatMs = grain.parameters.get("repeatMs");   // ✅ changed
  const pJitterMs = grain.parameters.get("jitterMs");
  const pReverse  = grain.parameters.get("reverse");

  let connected = false;
  let lastIn = null;
  let lastOut = null;

  function applyPreset(p, t) {
    const ramp = Math.max(0.001, (p.rampMs ?? 8) / 1000);

    output.gain.setValueAtTime(p.outGain ?? 1.0, t);

    pWindowMs.setValueAtTime(p.windowMs ?? 40, t);
    pRepeatMs.setValueAtTime(p.repeatMs ?? 80, t);      // ✅ changed
    pJitterMs.setValueAtTime(p.jitterMs ?? 0, t);
    pReverse.setValueAtTime(p.reverse ? 1 : 0, t);

    // HOLD: wet ramps up and stays
    pWet.cancelScheduledValues(t);
    pWet.setValueAtTime(pWet.value, t);
    pWet.linearRampToValueAtTime(p.wet ?? 1.0, t + ramp);

    const duck = Math.max(0, Math.min(1, p.duckDry ?? 1.0));
    const targetDry = 1.0 - (p.wet ?? 1.0) * duck;

    dry.gain.cancelScheduledValues(t);
    dry.gain.setValueAtTime(dry.gain.value, t);
    dry.gain.linearRampToValueAtTime(targetDry, t + ramp);
  }

  function connect(config = {}) {
    const t = config.t ?? audioCtx.currentTime;

    // keeping your flexible “config-is-preset” behavior
    const p = typeof config === "string"
      ? presets[config]
      : config ?? presets.beatRepeat;

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

    const ramp = 0.02;

    pWet.cancelScheduledValues(t);
    pWet.setValueAtTime(pWet.value, t);
    pWet.linearRampToValueAtTime(0.0, t + ramp);

    dry.gain.cancelScheduledValues(t);
    dry.gain.setValueAtTime(dry.gain.value, t);
    dry.gain.linearRampToValueAtTime(1.0, t + ramp);

    setTimeout(() => {
      try { lastIn.disconnect(input); } catch {}
      try { output.disconnect(lastOut); } catch {}
      connected = false;
      lastIn = null;
      lastOut = null;
    }, 25);
  }

  return { connect, disconnect, nodes: { input, dry, grain, wetGain, output } };
}
