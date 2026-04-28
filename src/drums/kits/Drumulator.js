// E-mu Drumulator kit manifest. See TR-808.js for the manifest shape rationale.
//
//   slot          pitch   sample           source file
//   ───────────────────────────────────────────────────────────────
//   kick          36      kick.wav         analog BD
//   snare         38      snare.wav
//   snare2        40      clap.wav         ← clap fills the alt-snare slot
//   hihatClosed   42      hihatClosed.wav
//   hihatOpen     46      hihatOpen.wav
//   ride          51      ride.wav
//   crash         49      crash.wav
//   tomLow        45      tomLow.wav
//   tomMid        48      tomMid.wav
//   tomHigh       50      tomHigh.wav
//
// Not provided: hihatPedal → hihatClosed (via DRUM_FALLBACK_CHAIN)

export const Drumulator = {
  name: 'Drumulator',
  drums: {
    kick:        () => import('../samples/Drumulator/kick.wav?url'),
    snare:       () => import('../samples/Drumulator/snare.wav?url'),
    snare2:      () => import('../samples/Drumulator/clap.wav?url'),
    hihatClosed: () => import('../samples/Drumulator/hihatClosed.wav?url'),
    hihatOpen:   () => import('../samples/Drumulator/hihatOpen.wav?url'),
    ride:        () => import('../samples/Drumulator/ride.wav?url'),
    crash:       () => import('../samples/Drumulator/crash.wav?url'),
    tomLow:      () => import('../samples/Drumulator/tomLow.wav?url'),
    tomMid:      () => import('../samples/Drumulator/tomMid.wav?url'),
    tomHigh:     () => import('../samples/Drumulator/tomHigh.wav?url'),
  },
}
