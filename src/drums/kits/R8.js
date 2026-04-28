// Roland R-8 kit manifest. See TR-808.js for the manifest shape rationale.
//
//   slot          pitch   sample              source file
//   ─────────────────────────────────────────────────────────
//   kick          36      kick.wav            R8 dry kick
//   snare         38      snare.wav           tight snare
//   snare2        40      sidestick.wav       ← sidestick fills the alt-snare slot
//   hihatClosed   42      hihatClosed.wav
//   hihatOpen     46      hihatOpen.wav
//   hihatPedal    44      hihatPedal.wav
//   ride          51      ride.wav            ride bell
//   crash         49      crash.wav
//   tomHigh       50      tomHigh.wav         dry tom 1
//   tomMid        48      tomMid.wav          dry tom 2
//   tomLow        45      tomLow.wav          dry tom 3
//
// Full-coverage acoustic kit — every slot has a real sample, no fallbacks needed.

export const R8 = {
  name: 'Roland R-8',
  drums: {
    kick:        () => import('../samples/R8/kick.wav?url'),
    snare:       () => import('../samples/R8/snare.wav?url'),
    snare2:      () => import('../samples/R8/sidestick.wav?url'),
    hihatClosed: () => import('../samples/R8/hihatClosed.wav?url'),
    hihatOpen:   () => import('../samples/R8/hihatOpen.wav?url'),
    hihatPedal:  () => import('../samples/R8/hihatPedal.wav?url'),
    ride:        () => import('../samples/R8/ride.wav?url'),
    crash:       () => import('../samples/R8/crash.wav?url'),
    tomHigh:     () => import('../samples/R8/tomHigh.wav?url'),
    tomMid:      () => import('../samples/R8/tomMid.wav?url'),
    tomLow:      () => import('../samples/R8/tomLow.wav?url'),
  },
}
