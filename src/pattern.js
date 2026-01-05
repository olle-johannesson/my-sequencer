import './polyfills';
import {DRUM_TO_PITCH} from "./drums/drumNameMaps.js";



const drumUrl = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn';
const drumSteps = 16;
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

export async function makePattern(seed, temperature = 1.2) {
  if (!rnn) await initMagenta();
  seed = sequences.quantizeNoteSequence(seed, 4);
  return rnn.continueSequence(seed, drumSteps, temperature);
}
