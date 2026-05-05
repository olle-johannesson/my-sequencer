// Casio VL-1 manifest. Toy keyboard with only 4 sampled drum sounds — every
// other magenta class falls through DRUM_FALLBACK_CHAIN.
//
//   slot          source file         notes
//   ──────────────────────────────────────────────────
//   kick          BASS1.WAV           VL-1's "drum machine" kick
//   snare         SNARE1.WAV
//   snare2        SNARE2.WAV          alt VL-1 snare
//   hihatClosed   HIHAT1.WAV          (only one hat)

export const VL1 = {
  name: 'Casio VL-1',
  drums: {
    kick:        () => import('../samples/Casio VL-1/BASS1.WAV?url'),
    snare:       () => import('../samples/Casio VL-1/SNARE1.WAV?url'),
    snare2:      () => import('../samples/Casio VL-1/SNARE2.WAV?url'),
    hihatClosed: () => import('../samples/Casio VL-1/HIHAT1.WAV?url'),
  },
}
