// CR-78 + MA101 kit manifest. See TR-808.js for the manifest shape rationale.
//
//   slot          pitch   sample                  source file
//   ─────────────────────────────────────────────────────────────────
//   kick          36      CR78 BD.wav             CR-78 bass drum
//   snare         38      CR78 SD.wav             CR-78 snare
//   snare2        40      CR78 PERCLP.wav         ← perc-clap subs for the alt-snare
//   hihatClosed   42      CR78 HIHAT.wav
//   hihatOpen     46      CR-78 OPHH 2.wav
//   hihatPedal    44      CR78 RIM.wav            ← rim subs for pedal hat
//   ride          51      CR-78 COWBL2.wav        ← cowbell subs for ride (no native)
//   crash         49      CR78 CYMBMAL.wav
//   tomHigh       50      CR78 HIBONGO.wav        ← high bongo subs for high tom
//   tomMid        48      CR78 LOBONGO.wav        ← low bongo subs for mid tom
//   tomLow        45      CR78 CONGA.wav          ← conga subs for low tom
//
// Full coverage — every magenta-emitable slot is filled.

export const CR78 = {
  name: 'CR-78',
  drums: {
    kick:        () => import('../samples/CR78 + MA101/CR78 BD.wav?url'),
    snare:       () => import('../samples/CR78 + MA101/CR78 SD.wav?url'),
    snare2:      () => import('../samples/CR78 + MA101/CR78 PERCLP.wav?url'),
    hihatClosed: () => import('../samples/CR78 + MA101/CR78 HIHAT.wav?url'),
    hihatOpen:   () => import('../samples/CR78 + MA101/CR-78 OPHH 2.wav?url'),
    hihatPedal:  () => import('../samples/CR78 + MA101/CR78 RIM.wav?url'),
    ride:        () => import('../samples/CR78 + MA101/CR-78 COWBL2.wav?url'),
    crash:       () => import('../samples/CR78 + MA101/CR78 CYMBMAL.wav?url'),
    tomHigh:     () => import('../samples/CR78 + MA101/CR78 HIBONGO.wav?url'),
    tomMid:      () => import('../samples/CR78 + MA101/CR78 LOBONGO.wav?url'),
    tomLow:      () => import('../samples/CR78 + MA101/CR78 CONGA.wav?url'),
  },
}
