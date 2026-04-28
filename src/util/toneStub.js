// =============================================================================
// Tone.js stub — replaces the real `tone` package via a vite alias.
// =============================================================================
//
// Why this exists:
//
// We use @magenta/music for ONE thing: drum pattern continuation via
// MusicRNN.continueSequence (pure TF.js inference + data manipulation).
// Magenta also ships with audio playback features (Player, SoundFontPlayer,
// Recorder, Metronome, DDSP synthesis) — none of which we touch — and those
// features depend on Tone.js.
//
// Tone.js does work at import time that breaks in a Web Worker context
// (constructs an OfflineAudioContext, accesses `window`, sets up a default
// audio context, etc.). Since we want to run magenta's RNN inference off the
// main thread for mobile responsiveness, the worker bundle has to load magenta
// without ever touching real Tone.
//
// Strategy: alias the entire `tone` package to this stub. Magenta's import
// statements still resolve, the symbols still exist, but they point at no-op
// proxies. We never call them (none of our code paths reach magenta's audio
// modules), so nothing actually executes — the stub just needs to *exist*
// to satisfy the imports.
//
// Bonus: removes ~150 KB from every bundle that includes magenta.
// =============================================================================

// Universal no-op: callable, constructable, returns itself for any property
// access. Lets things like `new Tone.PolySynth().connect(Tone.Master).start()`
// succeed without ever doing anything useful.
const noop = new Proxy(function () {}, {
  get: (_, k) => k === Symbol.toPrimitive ? () => 0 : noop,
  apply: () => noop,
  construct: () => noop,
})

// The named exports magenta references at module load. Magenta uses
// `import * as Tone from 'tone'` (a namespace import), so technically only
// these names being reachable as properties on the imported namespace matters.
// Listing them as explicit exports keeps tree-shakers happy and makes the
// surface area visible at a glance.
export const Compressor = noop
export const Context = noop
export const Draw = noop
export const Filter = noop
export const Frequency = noop
export const Loop = noop
export const Master = noop
export const MembraneSynth = noop
export const MetalSynth = noop
export const NoiseSynth = noop
export const Offline = noop
export const Part = noop
export const Player = noop
export const PolySynth = noop
export const Reverb = noop
export const Synth = noop
export const ToneAudioBuffers = noop
export const ToneBufferSource = noop
export const Transport = noop
export const context = noop
export const immediate = noop
export const loaded = noop
export const now = noop
export const setContext = noop

export default noop
