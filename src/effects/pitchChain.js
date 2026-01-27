export const presets = {
  semitoneUp: {
    wet: 1.0,
    pitchRatio: 1.059463,  // 2^(1/12) - one semitone up
    outGain: 1.0,
  },
  semitoneDown: {
    wet: 1.0,
    pitchRatio: 0.940,  // One octave up
    outGain: 0.9,  // Slightly lower since high frequencies can be loud
  },
};

export function createPitchChain(audioCtx) {
  const input = audioCtx.createGain();
  const pitchShifter = new AudioWorkletNode(audioCtx, "pitchshift", {
    parameterData: { wet: 1.0, pitchRatio: 1.0 },
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: 2,
    channelCountMode: 'max',
  });
  const output = audioCtx.createGain();

  input.channelCount = 2;
  input.channelCountMode = 'max';
  output.channelCount = 2;
  output.channelCountMode = 'max';

  input.connect(pitchShifter).connect(output);

  const pWet = pitchShifter.parameters.get("wet");
  const pPitchRatio = pitchShifter.parameters.get("pitchRatio");

  output.gain.value = 1.0;

  let connected = false;
  let lastIn = null;
  let lastOut = null;

  function applyPreset(p, t) {
    pWet.setValueAtTime(p.wet ?? 1.0, t);
    pPitchRatio.setValueAtTime(p.pitchRatio ?? 1.0, t);
    output.gain.setValueAtTime(p.outGain ?? 1.0, t);
  }

  function connect(config = {}) {
    const t = config.t ?? audioCtx.currentTime;
    const p = typeof config === "string"
      ? presets[config]
      : config ?? presets.semitoneUp;

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

    // Reset to bypass
    pWet.setValueAtTime(0.0, t);
    pPitchRatio.setValueAtTime(1.0, t);

    try { lastIn.disconnect(input); } catch {}
    try { output.disconnect(lastOut); } catch {}
    connected = false;
    lastIn = null;
    lastOut = null;
  }

  return { connect, disconnect, nodes: { input, pitchShifter, output } };
}
