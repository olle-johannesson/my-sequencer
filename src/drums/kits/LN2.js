// Oberheim DMX / LinnDrum II (LN2) kit manifest. See TR-808.js for the
// manifest shape rationale.
//
//   slot          pitch   sample              source file
//   ─────────────────────────────────────────────────────────
//   kick          36      LN2 BASS DR.wav
//   snare         38      LN2 SNAR DR.wav
//   hihatClosed   42      LN2 CLHH.wav
//   hihatOpen     46      LN2 OPHH.wav
//   ride          51      LN2 COWBELL.wav     ← LinnDrum has no ride; cowbell as "metallic ting"
//   tomHigh       50      LN2 TOM DR.wav      ← single tom mapped to high slot
//
// Not provided (fallback chain handles them):
//   snare2 → snare,  hihatPedal → hihatClosed,  crash → hihatOpen,
//   tomMid → tomHigh,  tomLow → tomHigh

export const LN2 = {
  name: 'Oberheim DMX / LN2',
  drums: {
    kick:        () => import('../samples/Oberhiem DMX + LN2 + TOM/LN2 BASS DR.wav?url'),
    snare:       () => import('../samples/Oberhiem DMX + LN2 + TOM/LN2 SNAR DR.wav?url'),
    hihatClosed: () => import('../samples/Oberhiem DMX + LN2 + TOM/LN2 CLHH.wav?url'),
    hihatOpen:   () => import('../samples/Oberhiem DMX + LN2 + TOM/LN2 OPHH.wav?url'),
    ride:        () => import('../samples/Oberhiem DMX + LN2 + TOM/LN2 COWBELL.wav?url'),
    tomHigh:     () => import('../samples/Oberhiem DMX + LN2 + TOM/LN2 TOM DR.wav?url'),
  },
}
