// Korg KR-mini kit manifest. See TR-808.js for the manifest shape rationale.
//
//   slot          pitch   sample                  source file
//   ───────────────────────────────────────────────────────────────
//   kick          36      BASSDRUM/BDRUM2.WAV
//   snare         38      SNARES/SNARE10.WAV
//   snare2        40      MISC/WOODBL1.WAV        ← woodblock subs for the alt-snare
//   hihatClosed   42      CYMBALS/HHCLOSE2.WAV
//   hihatOpen     46      CYMBALS/HHOPEN1.WAV
//   hihatPedal    44      CYMBALS/HHCLOSE4.WAV    ← shorter closed-hat as pedal
//   ride          51      MISC/WOODBL2.WAV        ← second woodblock as ride
//   tomHigh       50      MISC/TOM1.WAV
//   tomMid        48      MISC/TOM2.WAV
//
// Not provided (handled by DRUM_FALLBACK_CHAIN):
//   crash → hihatOpen (no native crash),  tomLow → tomMid (only two toms)

export const KRmini = {
  name: 'Korg KR-mini',
  drums: {
    kick:        () => import('../samples/KORGMINI/BASSDRUM/BDRUM2.WAV?url'),
    snare:       () => import('../samples/KORGMINI/SNARES/SNARE10.WAV?url'),
    snare2:      () => import('../samples/KORGMINI/MISC/WOODBL1.WAV?url'),
    hihatClosed: () => import('../samples/KORGMINI/CYMBALS/HHCLOSE2.WAV?url'),
    hihatOpen:   () => import('../samples/KORGMINI/CYMBALS/HHOPEN1.WAV?url'),
    hihatPedal:  () => import('../samples/KORGMINI/CYMBALS/HHCLOSE4.WAV?url'),
    ride:        () => import('../samples/KORGMINI/MISC/WOODBL2.WAV?url'),
    tomHigh:     () => import('../samples/KORGMINI/MISC/TOM1.WAV?url'),
    tomMid:      () => import('../samples/KORGMINI/MISC/TOM2.WAV?url'),
  },
}
