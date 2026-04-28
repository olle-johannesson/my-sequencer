// =============================================================================
// TR-808 kit manifest — reference shape for the lazy-load drum-kit refactor
// =============================================================================
//
// Pitch table for this kit (see also: drumNameMaps.js, magenta's
// DEFAULT_DRUM_PITCH_CLASSES). Slot keys MUST match DRUM_TO_PITCH keys —
// the runtime maps a magenta-emitted pitch through PITCH_TO_DRUM into a slot
// name and looks the sample up here. Pitches are listed for human reference;
// the system derives them from drumNameMaps.
//
//   slot          magenta class       canonical pitch   sample          source file
//   ─────────────────────────────────────────────────────────────────────────────
//   kick          0 (kick)            36                kick.wav        808 BD 1-1
//   snare         1 (snare)           38                snare.wav       808 SD 2-2
//   snare2        1 (snare, alt)      40                clap.wav        808 CP   ← clap fills the alt-snare slot
//   hihatClosed   2 (closed hh)       42                hihatClosed.wav 808 HC 1
//   hihatOpen     3 (open hh)         46                hihatOpen.wav   808 OH 1
//   ride          8 (ride)            51                cowbell.wav     808 COW  ← TR-808 has no real ride; cowbell is the closest "metallic ting"
//   crash         7 (crash)           49                crash.wav       808 CY 1-1
//   tomLow        4 (low tom)         45                tomLow.wav      808 LT 1
//   tomMid        5 (mid tom)         48                tomMid.wav      808 MT 1
//   tomHigh       6 (high tom)        50                tomHigh.wav     808 HT 1
//
// Slots NOT provided by this kit — handled by DRUM_FALLBACK_CHAIN in
// drumPattern.js (no need to alias them here):
//
//   hihatPedal  → hihatClosed
//
// Each entry is a thunk: the dynamic import only runs when the runtime
// decides that drum is actually needed for an upcoming bar. Vite's `?url`
// suffix makes the dynamic import resolve to the asset URL string (rather
// than transforming the wav as a JS module). Pair this with a small fetch
// + decodeAudioData step in the lazy loader to get an AudioBuffer.
// =============================================================================

export const TR808 = {
  name: 'TR-808',
  drums: {
    kick:        () => import('../samples/TR-808/kick.wav?url'),
    snare:       () => import('../samples/TR-808/snare.wav?url'),
    snare2:      () => import('../samples/TR-808/clap.wav?url'),
    hihatClosed: () => import('../samples/TR-808/hihatClosed.wav?url'),
    hihatOpen:   () => import('../samples/TR-808/hihatOpen.wav?url'),
    ride:        () => import('../samples/TR-808/cowbell.wav?url'),
    crash:       () => import('../samples/TR-808/crash.wav?url'),
    tomLow:      () => import('../samples/TR-808/tomLow.wav?url'),
    tomMid:      () => import('../samples/TR-808/tomMid.wav?url'),
    tomHigh:     () => import('../samples/TR-808/tomHigh.wav?url'),
  },
}
