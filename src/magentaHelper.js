const drumUrl = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn';
const numberOfSteps = 16;
let seed, rnn, sequences, MusicRNN;

export let magentaIsReady = false;

export async function initMagenta() {
  let module = await import('@magenta/music')
  sequences = module.sequences;
  MusicRNN = module.MusicRNN;
  rnn = new MusicRNN(drumUrl);
  await rnn.initialize();
  magentaIsReady = true;

  seed = {
    notes: [
      { pitch: 36, startTime: 0,   endTime: 0.5 }, // kick
      { pitch: 38, startTime: 0.5, endTime: 1.0 }, // snare
    ],
    totalTime: 1.0,
  };

  seed = sequences.quantizeNoteSequence(seed, 4);
}

/**
 *
 * @param seed {INoteSequence}
 * @param temperature {number}
 * @returns {Promise<INoteSequence>}
 */
export async function continuePattern(seed, temperature = 1.2) {
  if (!rnn) await initMagenta();
  // continueSequence requires an already-quantized sequence — it reads totalQuantizedSteps
  // and each note's quantizedStartStep directly, NOT startTime. So we feed it our 16-step
  // grid via quantizeSeed and bypass magenta's tempo-based quantizer (which would interpret
  // startTime as seconds at 120 BPM and squash totalTime: 1.0 into 8 steps).
  const quantized = seed?.totalQuantizedSteps !== undefined ? seed : quantizeSeed(seed)
  return rnn.continueSequence(quantized, numberOfSteps, temperature);
}

/**
 * Quantize a seed onto the 16th-note grid without running the RNN.
 * Maps startTime/totalTime into one of 16 steps directly — bypasses magenta's
 * tempo-dependent quantization (which would treat startTime as seconds at the
 * default 120 BPM and squash a `totalTime: 1.0` bar into 8 steps).
 * @param seed {INoteSequence}
 * @returns {INoteSequence}
 */
export function quantizeSeed(seed) {
  const total = seed.totalTime || 1
  return {
    ...seed,
    notes: seed.notes.map(n => ({
      ...n,
      quantizedStartStep: Math.round(n.startTime / total * 16) % 16,
      quantizedEndStep: Math.round(n.endTime / total * 16),
    })),
    quantizationInfo: {stepsPerQuarter: 4},
    totalQuantizedSteps: 16,
  }
}


