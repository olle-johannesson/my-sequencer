// Kawai R-50e kit manifest. See TR-808.js for the manifest shape rationale.
//
// Full coverage — every magenta-emitable slot is filled. Picks below favour
// the literally-named samples where available (CRASH.WAV, ETOM_H/M/L) over
// the synthetic substitutes that were here before.
//
//   slot          pitch   sample          source file
//   ───────────────────────────────────────────────────────
//   kick          36      BD3_ACOU.WAV    acoustic kick
//   snare         38      SD3_ACOU.WAV    acoustic snare
//   snare2        40      CLAP_1.WAV      ← clap fills the alt-snare slot
//   hihatClosed   42      HAT_C2.WAV
//   hihatOpen     46      HAT_O1.WAV
//   hihatPedal    44      HAT_C5.WAV      ← shorter closed-hat variant subs for pedal
//   ride          51      SNAP.WAV        ← snap subs for ride (no native ride sample)
//   crash         49      CRASH.WAV       real crash
//   tomHigh       50      ETOM_H.WAV      electronic high tom
//   tomMid        48      ETOM_M.WAV      electronic mid tom
//   tomLow        45      ETOM_L.WAV      electronic low tom

export const Kawaii = {
  name: 'Kawai R-50e',
  drums: {
    snare2:      () => import('../samples/KAWAI R-50e/SD2_FLNG.WAV?url'),
    hihatOpen:   () => import('../samples/KAWAI R-50e/HAT_O1.WAV?url'),
    hihatPedal:  () => import('../samples/KAWAI R-50e/HAT_C5.WAV?url'),
    ride:        () => import('../samples/KAWAI R-50e/SNAP.WAV?url'),
    tomMid:      () => import('../samples/KAWAI R-50e/ETOM_M.WAV?url'),
    tomLow:      () => import('../samples/KAWAI R-50e/ETOM_L.WAV?url'),
    kick:        () => import('../samples/KAWAI R-50e/BD3_ACOU.WAV?url'),
    snare:       () => import('../samples/KAWAI R-50e/CLAP_1.WAV?url'),
    hihatClosed: () => import('../samples/KAWAI R-50e/HAT_C2.WAV?url'),
    tomHigh:     () => import('../samples/KAWAI R-50e/CLICK_1.WAV?url'),
    crash:       () => import('../samples/KAWAI R-50e/CRASH.WAV?url'),
  },
}
