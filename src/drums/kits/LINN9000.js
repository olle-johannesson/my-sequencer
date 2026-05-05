// Linn 9000 kit manifest. See TR-808.js for the manifest shape rationale.
//
//   slot          pitch   sample              source file
//   ─────────────────────────────────────────────────────────
//   kick          36      LINNKICK.wav
//   snare         38      LINN SNARE.wav
//   snare2        40      LINN SNARE 2.wav
//   hihatClosed   42      LINN CLHH.wav
//   hihatOpen     46      LINN OPHH.wav
//   hihatPedal    44      RIM1.WAV          ← rim subs for pedal hat
//   ride          51      LINN RIDE3.wav
//   crash         49      CRASH1.WAV
//   tomHigh       50      TOM1.WAV
//   tomMid        48      TOM2.WAV
//   tomLow        45      TOM3.WAV
//
// Full coverage — every magenta-emitable slot is filled.

export const LINN9000 = {
  name: 'Linn 9000',
  drums: {
    kick:        () => import('../samples/LINN9000/LINNKICK.wav?url'),
    snare:       () => import('../samples/LINN9000/LINN SNARE.wav?url'),
    snare2:      () => import('../samples/LINN9000/LINN SNARE 2.wav?url'),
    hihatClosed: () => import('../samples/LINN9000/LINN CLHH.wav?url'),
    hihatOpen:   () => import('../samples/LINN9000/LINN OPHH.wav?url'),
    hihatPedal:  () => import('../samples/LINN9000/RIM1.WAV?url'),
    ride:        () => import('../samples/LINN9000/LINN RIDE3.wav?url'),
    crash:       () => import('../samples/LINN9000/CRASH1.WAV?url'),
    tomHigh:     () => import('../samples/LINN9000/TOM1.WAV?url'),
    tomMid:      () => import('../samples/LINN9000/TOM2.WAV?url'),
    tomLow:      () => import('../samples/LINN9000/TOM3.WAV?url'),
  },
}
