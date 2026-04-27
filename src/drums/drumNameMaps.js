
// const MIDINoteNumberToNoteType = {
//   27: "Laser",
//   28: "Whip",
//   29: "Scratch Push",
//   30: "Scratch Pull",
//   31: "Stick Click",
//   32: "Metronome Click",
//   34: "Metronome Bell",
//   35: "Bass Drum",
//   36: "Kick Drum",
//   37: "Snare Cross Stick",
//   38: "Snare Drum",
//   39: "Hand Clap",
//   40: "Electric Snare Drum",
//   41: "Floor Tom 2",
//   42: "Hi-Hat Closed",
//   43: "Floor Tom 1",
//   44: "Hi-Hat Foot",
//   45: "Low Tom",
//   46: "Hi-Hat Open",
//   47: "Low-Mid Tom",
//   48: "High-Mid Tom",
//   49: "Crash Cymbal",
//   50: "High Tom",
//   51: "Ride Cymbal",
//   52: "China Cymbal",
//   53: "Ride Bell",
//   54: "Tambourine",
//   55: "Splash cymbal",
//   56: "Cowbell",
//   57: "Crash Cymbal 2",
//   58: "Vibraslap",
//   59: "Ride Cymbal 2",
//   60: "High Bongo",
//   61: "Low Bongo",
//   62: "Conga Dead Stroke",
//   63: "Conga",
//   64: "Tumba",
//   65: "High Timbale",
//   66: "Low Timbale",
//   67: "High Agogo",
//   68: "Low Agogo",
//   69: "Cabasa",
//   70: "Maracas",
//   71: "Whistle Short",
//   72: "Whistle Long",
//   73: "Guiro Short",
//   74: "Guiro Long",
//   75: "Claves",
//   76: "High Woodblock",
//   77: "Low Woodblock",
//   78: "Cuica High",
//   79: "Cuica Low",
//   80: "Triangle Mute",
//   81: "Triangle Open",
//   82: "Shaker",
//   83: "Sleigh Bell",
//   84: "Bell Tree",
//   85: "Castanets",
//   86: "Surdu Dead Stroke",
//   87: "Surdu",
// // 88,
// // 89,
// // 90,
//   91: "Snare Drum Rod",
//   92: "Ocean Drum",
//   93: "Snare Drum Brush"
// }


// Pitches must align with magenta's DEFAULT_DRUM_PITCH_CLASSES so the drum_kit_rnn
// continuation outputs canonical class pitches we can map back. The first pitch in
// each magenta class is what the model emits; we use those here.
export const DRUM_TO_PITCH = Object.freeze({
  kick: 36,
  snare: 38,
  snare2: 40,        // secondary snare class member; magenta will output it as 38
  hihatClosed: 42,
  hihatPedal: 44,    // secondary closed-hat class member; magenta will output it as 42
  hihatOpen: 46,
  crash: 49,
  ride: 51,
  tomLow: 45,
  tomMid: 48,        // canonical magenta mid-tom output
  tomHigh: 50        // canonical magenta high-tom output
})

// Reverse map covering every pitch in magenta's drum classes, so any continuation
// pitch lands on a drum name our kits know about.
export const PITCH_TO_DRUM = Object.freeze({
  // kick (class 0)
  36: 'kick', 35: 'kick',
  // snare (class 1)
  38: 'snare', 27: 'snare', 28: 'snare', 31: 'snare', 32: 'snare', 33: 'snare',
  34: 'snare', 37: 'snare', 39: 'snare', 40: 'snare2', 56: 'snare', 65: 'snare',
  66: 'snare', 75: 'snare', 85: 'snare',
  // closed hihat (class 2)
  42: 'hihatClosed', 44: 'hihatPedal', 54: 'hihatClosed', 68: 'hihatClosed',
  69: 'hihatClosed', 70: 'hihatClosed', 71: 'hihatClosed', 73: 'hihatClosed',
  78: 'hihatClosed', 80: 'hihatClosed',
  // open hihat (class 3)
  46: 'hihatOpen', 67: 'hihatOpen', 72: 'hihatOpen', 74: 'hihatOpen',
  79: 'hihatOpen', 81: 'hihatOpen',
  // low tom (class 4)
  45: 'tomLow', 29: 'tomLow', 41: 'tomLow', 61: 'tomLow', 64: 'tomLow', 84: 'tomLow',
  // mid tom (class 5)
  48: 'tomMid', 47: 'tomMid', 60: 'tomMid', 63: 'tomMid', 77: 'tomMid', 86: 'tomMid', 87: 'tomMid',
  // high tom (class 6)
  50: 'tomHigh', 30: 'tomHigh', 43: 'tomHigh', 62: 'tomHigh', 76: 'tomHigh', 83: 'tomHigh',
  // crash (class 7)
  49: 'crash', 55: 'crash', 57: 'crash', 58: 'crash',
  // ride (class 8)
  51: 'ride', 52: 'ride', 53: 'ride', 59: 'ride', 82: 'ride',
})

