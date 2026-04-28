// E-mu SP-12 kit manifest. See TR-808.js for the manifest shape rationale.
//
//   slot          pitch   sample              source file
//   ─────────────────────────────────────────────────────────
//   kick          36      kick.wav
//   snare         38      snare.wav
//   snare2        40      clap.wav            ← clap fills the alt-snare slot
//   hihatClosed   42      hihatClosed.wav
//   hihatOpen     46      hihatOpen.wav
//   hihatPedal    44      rim.wav             ← rim fills the pedal-hat slot
//   ride          51      ride.wav
//   crash         49      crash.wav
//   tomHigh       50      tomHigh.wav
//   tomMid        48      tomMid.wav
//   tomLow        45      tomLow.wav
//
// Full-coverage sampling-era kit — every slot filled.

export const SP12 = {
  name: 'E-mu SP-12',
  drums: {
    kick:        () => import('../samples/SP-12/kick.wav?url'),
    snare:       () => import('../samples/SP-12/snare.wav?url'),
    snare2:      () => import('../samples/SP-12/clap.wav?url'),
    hihatClosed: () => import('../samples/SP-12/hihatClosed.wav?url'),
    hihatOpen:   () => import('../samples/SP-12/hihatOpen.wav?url'),
    hihatPedal:  () => import('../samples/SP-12/rim.wav?url'),
    ride:        () => import('../samples/SP-12/ride.wav?url'),
    crash:       () => import('../samples/SP-12/crash.wav?url'),
    tomHigh:     () => import('../samples/SP-12/tomHigh.wav?url'),
    tomMid:      () => import('../samples/SP-12/tomMid.wav?url'),
    tomLow:      () => import('../samples/SP-12/tomLow.wav?url'),
  },
}
