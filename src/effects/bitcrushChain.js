export const presets = {
  crunch: {
    crush: { bitDepth: 4, rateReduction: 0.32 },
    postLPF: { enabled: true, hz: 9000, Q: 0.7 },
    outGain: 1.0,
  },
  lofi: {
    crush: { bitDepth: 12, rateReduction: 0.15 },  // Low sample rate, high bit depth
    postLPF: { enabled: true, hz: 6000, Q: 0.7 },
    outGain: 1.1,
  },
  meltdown: {
    crush: { bitDepthStart: 12, bitDepthEnd: 3, rrStart: 1.0, rrEnd: 0.08, dur: 0.15 },
    postLPF: { enabled: true, hz: 7000, Q: 0.7 },
    outGain: 1.0,
  },
};

export function createBitcrushChain(audioCtx) {
  const input = audioCtx.createGain();
  const bitcrusher = new AudioWorkletNode(audioCtx, 'bitcrusher', {
    parameterData: { bitDepth: 8, rateReduction: 0.5 },
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 2,
    channelCountMode: 'max',
  });

  const postFilter = audioCtx.createBiquadFilter();
  postFilter.type = 'lowpass';
  postFilter.frequency.value = 12000;
  postFilter.Q.value = 0.7;
  postFilter.channelCount = 2;
  postFilter.channelCountMode = 'max';

  const output = audioCtx.createGain();
  output.gain.value = 1.0;
  output.channelCount = 2;
  output.channelCountMode = 'max';

  input.connect(bitcrusher);
  bitcrusher.connect(postFilter);
  postFilter.connect(output);

  let connected = false;
  let lastIn = null;
  let lastOut = null;

  const pBitDepth = bitcrusher.parameters.get('bitDepth');
  const pRR = bitcrusher.parameters.get('rateReduction');

  function applyPreset(p, t) {
    output.gain.setValueAtTime(p.outGain ?? 1.0, t);

    if (p.postLPF?.enabled) {
      postFilter.frequency.setValueAtTime(p.postLPF.hz ?? 9000, t);
      postFilter.Q.setValueAtTime(p.postLPF.Q ?? 0.7, t);
    } else {
      // effectively bypass by opening filter
      postFilter.frequency.setValueAtTime(20000, t);
      postFilter.Q.setValueAtTime(0.7, t);
    }

    if (p.crush?.dur) {
      // macro sweep
      const dur = p.crush.dur;
      pBitDepth.cancelScheduledValues(t);
      pRR.cancelScheduledValues(t);

      pBitDepth.setValueAtTime(p.crush.bitDepthStart, t);
      pBitDepth.linearRampToValueAtTime(p.crush.bitDepthEnd, t + dur);

      pRR.setValueAtTime(p.crush.rrStart, t);
      pRR.linearRampToValueAtTime(p.crush.rrEnd, t + dur);
    } else {
      // fixed settings
      pBitDepth.setValueAtTime(p.crush.bitDepth ?? 8, t);
      pRR.setValueAtTime(p.crush.rateReduction ?? 0.5, t);
    }
  }

  function connect(config = {}) {
    const t = config.t ?? audioCtx.currentTime;
    const p = typeof config === 'string'
      ? presets[preset]
      : config ?? presets.crunch;

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

    // Reset to bypass state
    pBitDepth.cancelScheduledValues(t);
    pBitDepth.setValueAtTime(16, t);  // Max bit depth = clean
    pRR.cancelScheduledValues(t);
    pRR.setValueAtTime(1.0, t);  // Full rate = clean

    try { lastIn.disconnect(input); } catch {}
    try { output.disconnect(lastOut); } catch {}
    connected = false;
    lastIn = null;
    lastOut = null;
  }

  return {
    connect,
    disconnect,
    nodes: { input, bitcrusher, postFilter, output },
  };
}
