// Yamaha RX5 kit manifest. See TR-808.js for the manifest shape rationale.
//
//   slot          pitch   sample              source file
//   ─────────────────────────────────────────────────────────
//   kick          36      kick.wav
//   snare         38      snare.wav
//   snare2        40      clap.wav            ← clap fills the alt-snare slot
//   hihatClosed   42      hihatClosed.wav
//   hihatOpen     46      hihatOpen.wav
//   hihatPedal    44      hihatPedal.wav
//   ride          51      rim.wav             ← rim subs for ride
//   crash         49      crash.wav
//   tomHigh       50      tomHigh.wav
//   tomMid        48      tomMid.wav
//   tomLow        45      tomLow.wav
//
// Full-coverage polished pop kit — every slot filled.

export const RX5 = {
  name: 'Yamaha RX5',
  drums: {
    kick:        () => import('../samples/RX5/kick.wav?url'),
    snare:       () => import('../samples/RX5/snare.wav?url'),
    snare2:      () => import('../samples/RX5/clap.wav?url'),
    hihatClosed: () => import('../samples/RX5/hihatClosed.wav?url'),
    hihatOpen:   () => import('../samples/RX5/hihatOpen.wav?url'),
    hihatPedal:  () => import('../samples/RX5/hihatPedal.wav?url'),
    ride:        () => import('../samples/RX5/rim.wav?url'),
    crash:       () => import('../samples/RX5/crash.wav?url'),
    tomHigh:     () => import('../samples/RX5/tomHigh.wav?url'),
    tomMid:      () => import('../samples/RX5/tomMid.wav?url'),
    tomLow:      () => import('../samples/RX5/tomLow.wav?url'),
  },
}
