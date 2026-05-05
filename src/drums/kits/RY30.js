// Yamaha RY30 kit manifest. Late-80s/early-90s digital drum machine, big
// punchy samples — great for "real kit" rock/pop patterns and Bonham-style
// bombs. Picks below are first-pass defaults from a multi-variant library;
// swap to other BDRUM/SNARE/etc. files in src/drums/samples/RY30 if a
// specific preset wants a different character.
//
//   slot          source file        picked from
//   ───────────────────────────────────────────────
//   kick          kick.wav           BDRUM5.WAV
//   snare         snare.wav          SNARE10.WAV
//   snare2        clap.wav           CLAP.WAV
//   hihatClosed   hihatClosed.wav    HHCLOSE1.WAV
//   hihatOpen     hihatOpen.wav      HHOPEN1.WAV
//   hihatPedal    hihatPedal.wav     HHPEDAL1.WAV
//   ride          ride.wav           RIDEMID.WAV
//   crash         crash.wav          CRASH1.WAV
//   tomHigh       tomHigh.wav        TOMHI1.WAV
//   tomMid        tomMid.wav         TOMMID3.WAV
//   tomLow        tomLow.wav         TOMLOW1.WAV

export const RY30 = {
  name: 'Yamaha RY30',
  drums: {
    kick:        () => import('../samples/RY30/kick.wav?url'),
    snare:       () => import('../samples/RY30/snare.wav?url'),
    snare2:      () => import('../samples/RY30/clap.wav?url'),
    hihatClosed: () => import('../samples/RY30/hihatClosed.wav?url'),
    hihatOpen:   () => import('../samples/RY30/hihatOpen.wav?url'),
    hihatPedal:  () => import('../samples/RY30/hihatPedal.wav?url'),
    ride:        () => import('../samples/RY30/ride.wav?url'),
    crash:       () => import('../samples/RY30/crash.wav?url'),
    tomHigh:     () => import('../samples/RY30/tomHigh.wav?url'),
    tomMid:      () => import('../samples/RY30/tomMid.wav?url'),
    tomLow:      () => import('../samples/RY30/tomLow.wav?url'),
  },
}
