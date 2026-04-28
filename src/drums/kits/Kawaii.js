// Kawai R-50e kit manifest. See TR-808.js for the manifest shape rationale.
//
// Sparse kit — only 5 slots filled. Other drum classes magenta might emit
// (open hat, ride, low/mid toms, hihatPedal, snare2) all fall back via the
// chain in drumPattern.js.
//
//   slot          pitch   sample          source file
//   ───────────────────────────────────────────────────────
//   kick          36      BD3_ACOU.WAV    acoustic kick
//   snare         38      CLAP_1.WAV      ← clap fills the snare slot
//   hihatClosed   42      HAT_C2.WAV
//   tomHigh       50      CLICK_1.WAV     ← click subs for high tom
//   crash         49      CRASH.WAV
//
// Not provided (fallback chain handles them):
//   snare2 → snare,  hihatPedal → hihatClosed,  hihatOpen → hihatClosed,
//   ride → hihatClosed,  tomMid → tomHigh,  tomLow → tomHigh

export const Kawaii = {
  name: 'Kawai R-50e',
  drums: {
    kick:        () => import('../samples/KAWAI R-50e/BD3_ACOU.WAV?url'),
    snare:       () => import('../samples/KAWAI R-50e/CLAP_1.WAV?url'),
    hihatClosed: () => import('../samples/KAWAI R-50e/HAT_C2.WAV?url'),
    tomHigh:     () => import('../samples/KAWAI R-50e/CLICK_1.WAV?url'),
    crash:       () => import('../samples/KAWAI R-50e/CRASH.WAV?url'),
  },
}
