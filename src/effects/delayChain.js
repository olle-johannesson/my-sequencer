export const presets = {
  slapback: {
    delayTime: 0.11,
    feedback: 0.22,
    fbLPFHz: 7000,
    wet: 0.28,
    wetRampMs: 15,
    lfo: { rate: 0, depth: 0 }
  },

  dub: {
    delayTime: 0.22,
    feedback: 0.68,
    fbLPFHz: 3200,
    wet: 0.45,
    wetRampMs: 15,
    lfo: { rate: 0, depth: 0 }
  },

  semitoneUp: {
    delayTime: 0.02,    // Short delay for pitch shift
    feedback: 0.0,       // No feedback
    fbLPFHz: 12000,
    wet: 1.0,            // 100% wet
    dry: 0.1,
    wetRampMs: 5,
    lfo: { rate: 6, depth: 0.003 }  // Modulate delay time for pitch effect
  },

  semitoneDown: {
    delayTime: 0.115,    // Even shorter delay
    feedback: 0.0,
    fbLPFHz: 12000,
    wet: 1.0,
    dry: 0.1,
    wetRampMs: 5,
    lfo: { rate: 12, depth: 0.006 }  // Faster & deeper modulation
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

  // LFO for delay time modulation (pitch shifting)
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0;
  lfoGain.gain.value = 0;
  lfo.connect(lfoGain).connect(delay.delayTime);

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

  let lfoStarted = false;
  let connected = false;
  let lastIn = null;
  let lastOut = null;

  function applyPreset(p, t) {
    if (!lfoStarted) {
      lfo.start(t);
      lfoStarted = true;
    }

    const ramp = Math.max(0.001, (p.wetRampMs ?? 10) / 1000);

    delay.delayTime.setValueAtTime(p.delayTime ?? 0.22, t);
    fbGain.gain.setValueAtTime(p.feedback ?? 0.6, t);
    fbFilter.frequency.setValueAtTime(p.fbLPFHz ?? 4000, t);

    // LFO modulation
    lfo.frequency.setValueAtTime(p.lfo?.rate ?? 0, t);
    lfoGain.gain.setValueAtTime(p.lfo?.depth ?? 0, t);

    wet.gain.cancelScheduledValues(t);
    wet.gain.setValueAtTime(wet.gain.value, t);
    wet.gain.linearRampToValueAtTime(p.wet ?? 0.4, t + ramp);

    if (p.dry) {
      dry.gain.cancelScheduledValues(t);
      dry.gain.setValueAtTime(dry.gain.value, t);
      dry.gain.linearRampToValueAtTime(p.dry ?? 0.4, t + ramp);
    }
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

    // Fade out and reset
    wet.gain.cancelScheduledValues(t);
    wet.gain.setValueAtTime(wet.gain.value, t);
    wet.gain.linearRampToValueAtTime(0.0, t + 0.02);

    // Stop LFO modulation
    lfoGain.gain.setValueAtTime(0, t);

    // Clear feedback to stop delay tails
    fbGain.gain.setValueAtTime(0, t);

    setTimeout(() => {
      try { lastIn.disconnect(input); } catch {}
      try { output.disconnect(lastOut); } catch {}
      connected = false;
      lastIn = null;
      lastOut = null;
    }, 25);
  }

  return { connect, disconnect, nodes: { input, delay, fbGain, fbFilter, dry, wet, output } };
}
