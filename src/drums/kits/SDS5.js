// Simmons SDS5 kit manifest. See TR-808.js for the manifest shape rationale.
//
//   slot          pitch   sample                  source file
//   ────────────────────────────────────────────────────────────────
//   kick          36      BASSDRUM/BDRUM8.WAV
//   snare         38      SNARES/SNARE1.WAV
//   snare2        40      SNARES/SNARE15.WAV
//   hihatClosed   42      CYMBALS/HHCLOSE2.WAV
//   hihatOpen     46      CYMBALS/HHOPEN1.WAV
//   hihatPedal    44      CYMBALS/HHPEDAL2.WAV
//   ride          51      SNARES/RIMSHOT4.WAV   ← rimshot subs for ride (no native ride)
//   tomHigh       50      TOMTOMS/TOM6.WAV
//   tomMid        48      TOMTOMS/TOM7.WAV
//   tomLow        45      TOMTOMS/TOM10.WAV
//
// Not provided (fallback chain handles it):
//   crash → hihatOpen → hihatClosed (no native crash sample in this set)

export const SDS5 = {
  name: 'Simmons SDS5',
  drums: {
    kick:        () => import('../samples/Simmons SDS5/BASSDRUM/BDRUM8.WAV?url'),
    snare:       () => import('../samples/Simmons SDS5/SNARES/SNARE1.WAV?url'),
    snare2:      () => import('../samples/Simmons SDS5/SNARES/SNARE15.WAV?url'),
    hihatClosed: () => import('../samples/Simmons SDS5/CYMBALS/HHCLOSE2.WAV?url'),
    hihatOpen:   () => import('../samples/Simmons SDS5/CYMBALS/HHOPEN1.WAV?url'),
    hihatPedal:  () => import('../samples/Simmons SDS5/CYMBALS/HHPEDAL2.WAV?url'),
    ride:        () => import('../samples/Simmons SDS5/SNARES/RIMSHOT4.WAV?url'),
    tomHigh:     () => import('../samples/Simmons SDS5/TOMTOMS/TOM6.WAV?url'),
    tomMid:      () => import('../samples/Simmons SDS5/TOMTOMS/TOM7.WAV?url'),
    tomLow:      () => import('../samples/Simmons SDS5/TOMTOMS/TOM10.WAV?url'),
  },
}
