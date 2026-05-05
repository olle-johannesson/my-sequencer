// Convert BPM to milliseconds for note subdivisions
function bpmToMs(bpm, subdivision) {
  const beatMs = (60 / bpm) * 1000;
  return beatMs / subdivision;
}

export const presets = {
  // PO-12 style repeats - capture and loop segments (max 200ms window)
  repeat1: (bpm) => {
    const thirtySecondMs = bpmToMs(bpm, 8);  // 1/32 note - fast glitchy texture
    return {
      wet: 1.0,
      windowMs: Math.min(200, thirtySecondMs * 0.8),
      repeatMs: thirtySecondMs,
      jitterMs: thirtySecondMs * 0.05,  // 5% jitter for texture
      reverse: 0,
      rampMs: 2,
      duckDry: 1.0,
      outGain: 1.1,
    };
  },

  repeat2: (bpm) => {
    const eighthMs = bpmToMs(bpm, 2);  // 1/8 note
    // Window is capped at 200ms but repeats at full 8th note timing
    return {
      wet: 1.0,
      windowMs: Math.min(200, eighthMs),
      repeatMs: eighthMs,
      jitterMs: 0,
      reverse: 0,
      rampMs: 8,
      duckDry: 1.0,
      outGain: 1.0,
    };
  },

  reverse: (bpm) => {
    const eighthMs = bpmToMs(bpm, 2);  // 1/8 note
    return {
      wet: 1.0,
      windowMs: 175,
      repeatMs: 175,
      jitterMs: 0,
      reverse: 1,
      rampMs: 8,
      duckDry: 1.0,
      outGain: 1.2,  // Boost for prominence
    };
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
      repeatMs: 80,
      jitterMs: 0,
      reverse: 0,
    },
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 2,
    channelCountMode: 'max',
  });

  input.channelCount = 2;
  input.channelCountMode = 'max';
  dry.channelCount = 2;
  dry.channelCountMode = 'max';
  wetGain.channelCount = 2;
  wetGain.channelCountMode = 'max';
  output.channelCount = 2;
  output.channelCountMode = 'max';

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

    // Config should already be resolved from fxEngine
    const p = config;

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
