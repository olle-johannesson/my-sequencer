// Roland TR-909 kit manifest. The dance/techno/house workhorse — big
// analog-sample kicks, bright crisp hi-hats, that iconic clap. Defaults
// below picked from the friendly-named variants of the sample library.
//
//   slot          source file        picked from
//   ───────────────────────────────────────────────
//   kick          kick.wav           BDRUM3.WAV
//   snare         snare.wav          SNARE5.WAV
//   snare2        clap.wav           CLAP1.WAV
//   hihatClosed   hihatClosed.wav    HHCLOSE1.WAV
//   hihatOpen     hihatOpen.wav      HHOPEN1.WAV
//   ride          ride.wav           RIDE1.WAV
//   crash         crash.wav          CRASH1.WAV
//   tomLow        tomLow.wav         TOM3.WAV
//   tomMid        tomMid.wav         TOM5.WAV
//   tomHigh       tomHigh.wav        TOM7.WAV

export const TR909 = {
  name: 'TR-909',
  drums: {
    kick:        () => import('../samples/TR-909/kick.wav?url'),
    snare:       () => import('../samples/TR-909/snare.wav?url'),
    snare2:      () => import('../samples/TR-909/clap.wav?url'),
    hihatClosed: () => import('../samples/TR-909/hihatClosed.wav?url'),
    hihatOpen:   () => import('../samples/TR-909/hihatOpen.wav?url'),
    ride:        () => import('../samples/TR-909/ride.wav?url'),
    crash:       () => import('../samples/TR-909/crash.wav?url'),
    tomLow:      () => import('../samples/TR-909/tomLow.wav?url'),
    tomMid:      () => import('../samples/TR-909/tomMid.wav?url'),
    tomHigh:     () => import('../samples/TR-909/tomHigh.wav?url'),
  },
}
