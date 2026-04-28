// Korg KR-mini kit manifest. See TR-808.js for the manifest shape rationale.
//
//   slot          pitch   sample                  source file
//   ───────────────────────────────────────────────────────────────
//   kick          36      BASSDRUM/BDRUM2.WAV
//   snare         38      SNARES/SNARE10.WAV
//   hihatClosed   42      CYMBALS/HHCLOSE2.WAV
//   hihatOpen     46      CYMBALS/HHOPEN1.WAV
//   tomHigh       50      MISC/TOM1.WAV
//   tomMid        48      MISC/TOM2.WAV
//
// Not provided (fallback chain handles them):
//   snare2 → snare,  hihatPedal → hihatClosed,  ride → hihatClosed,
//   crash → hihatOpen,  tomLow → tomMid

export const KRmini = {
  name: 'Korg KR-mini',
  drums: {
    kick:        () => import('../samples/KORGMINI/BASSDRUM/BDRUM2.WAV?url'),
    snare:       () => import('../samples/KORGMINI/SNARES/SNARE10.WAV?url'),
    hihatClosed: () => import('../samples/KORGMINI/CYMBALS/HHCLOSE2.WAV?url'),
    hihatOpen:   () => import('../samples/KORGMINI/CYMBALS/HHOPEN1.WAV?url'),
    tomHigh:     () => import('../samples/KORGMINI/MISC/TOM1.WAV?url'),
    tomMid:      () => import('../samples/KORGMINI/MISC/TOM2.WAV?url'),
  },
}
