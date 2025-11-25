import './polyfills';


const drumUrl = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn';
const drumSteps = 16;
let seed, rnn;

export async function initMagenta() {
  let module = await import('@magenta/music')
  const { MusicRNN, sequences } = module;
  rnn = new MusicRNN(drumUrl);
  await rnn.initialize();

  seed = {
    notes: [
      { pitch: 36, startTime: 0,   endTime: 0.5 }, // kick
      { pitch: 38, startTime: 0.5, endTime: 1.0 }, // snare
    ],
    totalTime: 1.0,
  };

  seed = sequences.quantizeNoteSequence(seed, 4);
}

export async function makePattern() {
  if (!rnn) await initMagenta();
  // arguments: (seed, numSteps, temperature)
  return rnn.continueSequence(seed, drumSteps, 1.2);
}


export const DRUM_MAP = Object.freeze({
  36: 'kick',
  38: 'snare',
  40: 'snare2',
  42: 'hihatClosed',
  44: 'hihatPedal',
  46: 'hihatOpen',
  49: 'crash',
  51: 'ride',
  45: 'tomLow',
  47: 'tomMid',
  48: 'tomHigh'
})