// Korg 01/W workstation drum samples. Big folder (~80 wav files), but magenta's
// drum_kit_rnn only ever emits 11 canonical pitches — one per drum class — so
// the manifest can only "officially" expose 11 slots. The picks below use the
// most natural-sounding sample for each slot; alternatives are listed inline
// so a swap is a one-line edit when a preset wants a different character.
//
//   slot          source file        alternatives in src/drums/samples/01w drums/
//   ───────────────────────────────────────────────────────────────────────────
//   kick          REAL K.wav         AMB K, CRSP K, DNC K, FAT K, GTD K, MTL K,
//                                    PNCH K, PROC K, RCK K, SYN K 1, SYN K 2
//   snare         SNR 1.wav          SNR 2, AMB S, GTD S, HOS S, PICL S, RCK S,
//                                    REV S, ROL S 1, ROL S 2, SOFT S, SYN S 1,
//                                    SYN S 2, TITE S
//   snare2        HAND CLAPS.wav     SD STK (sidestick), FGR SNAP, FIST,
//                                    SYN RIM, STK HIT
//   hihatClosed   CL HH.wav          TITE HH, CL SYN HH
//   hihatOpen     OP HH.wav          OP SYN HH
//   hihatPedal    PDL HH.wav         (only one)
//   ride          RIDE EDG.wav       RIDE CUP (bell)
//   crash         CRASH CYM.wav      (only one)
//   tomLow        SYN TOM 1.wav      PROC TOM
//   tomMid        01W TOM.wav        PROC TOM, SYN TOM 1, SYN TOM 2
//   tomHigh       SYN TOM 2.wav      PROC TOM
//
// Percussion (cowbell, congas, bongos, timbales, woodblocks, marimba, kalimba,
// tambourine, cabasa, etc.) is in the folder but magenta won't reach for it
// in continuation — those pitches all collapse to a class canonical. They're
// usable inside seed.notes if a preset wants to plant a specific accent.

export const Korg01W = {
  name: 'Korg 01/W',
  drums: {
    kick:        () => import('../samples/01w drums/REAL K.wav?url'),
    snare:       () => import('../samples/01w drums/SNR 1.wav?url'),
    snare2:      () => import('../samples/01w drums/HAND CLAPS.wav?url'),
    hihatClosed: () => import('../samples/01w drums/CL HH.wav?url'),
    hihatOpen:   () => import('../samples/01w drums/OP HH.wav?url'),
    hihatPedal:  () => import('../samples/01w drums/PDL HH.wav?url'),
    ride:        () => import('../samples/01w drums/RIDE EDG.wav?url'),
    crash:       () => import('../samples/01w drums/CRASH CYM.wav?url'),
    tomLow:      () => import('../samples/01w drums/SYN TOM 1.wav?url'),
    tomMid:      () => import('../samples/01w drums/01W TOM.wav?url'),
    tomHigh:     () => import('../samples/01w drums/SYN TOM 2.wav?url'),
  },
}
