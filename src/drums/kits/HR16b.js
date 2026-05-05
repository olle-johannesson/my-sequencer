// Alesis HR-16:B kit manifest. The "B" expansion EPROM — the lo-fi 80s/90s
// drum machine famously used on De La Soul's "Three Feet High and Rising"
// and a ton of early hip-hop. Punchy, cheap-sounding, perfect for boom-bap.
//
//   slot          source file        alternatives in src/drums/samples/Alesis HR16b/
//   ───────────────────────────────────────────────────────────────────────────
//   kick          BDRM01.WAV         BDRM02-07, BDRM04OV (overdriven variant)
//   snare         SNARE01.WAV        SNARE01B, SNARE02-10 (10 variants total)
//   snare2        CLAP01.WAV         STIK (stick click — also valid here)
//   hihatClosed   CHH01.WAV          CHH02, CHH03
//   hihatOpen     OHH01.WAV          OHH02
//   ride          RIDE01.WAV         (only one)
//   crash         CRASH01.WAV        (only one)
//   tomLow        TOM02.WAV          TOM02-B (alt layer)
//   tomMid        TOM01-B.WAV        (B-layer of high tom — sits between)
//   tomHigh       TOM01.WAV          (only the "main" high tom)
//
// hihatPedal is not provided — falls through DRUM_FALLBACK_CHAIN to
// hihatClosed automatically (see drumPattern.js).
//
// Bonus samples available in the folder (not magenta-reachable, but usable
// in seed.notes via specific pitches if a preset wants them):
// CABASA01-04, CONGAHI, CONGAHI2, CONGALO, GLASBELL, HIT01, HIT02,
// METBELL, METBELL2, POP01, POP02, RIMSHOT1, RIMSHOT2, SCRATCH1,
// SFX1, SFX1-A, SFX1-B, TAMBORIN, BREAK (the loop), OOH (vocal sample).

export const HR16b = {
  name: 'Alesis HR-16:B',
  drums: {
    kick:        () => import('../samples/Alesis HR16b/BDRM07.WAV?url'),
    snare:       () => import('../samples/Alesis HR16b/SNARE03.WAV?url'),
    snare2:      () => import('../samples/Alesis HR16b/SNARE01.WAV?url'),
    hihatClosed: () => import('../samples/Alesis HR16b/CHH03.WAV?url'),
    hihatOpen:   () => import('../samples/Alesis HR16b/OHH02.WAV?url'),
    ride:        () => import('../samples/Alesis HR16b/SCRATCH1.WAV?url'),
    crash:       () => import('../samples/Alesis HR16b/BREAK.WAV?url'),
    tomLow:      () => import('../samples/Alesis HR16b/METBELL.WAV?url'),
    tomMid:      () => import('../samples/Alesis HR16b/POP02.WAV?url'),
    tomHigh:     () => import('../samples/Alesis HR16b/POP01.WAV?url'),
  },
}
