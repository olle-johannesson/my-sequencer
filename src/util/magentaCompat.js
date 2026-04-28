// =============================================================================
// Worker-tolerant replacement for @magenta/music/esm/core/compat/global_browser.js
// =============================================================================
//
// Why this exists:
//
// Magenta's stock global_browser.js does this:
//
//   if (isWorker) throw new Error('Cannot use offline audio context in a web worker.')
//
// inside getOfflineAudioContext(). That function is called *at module-load time*
// from core/audio_utils.js (line 8: `const offlineCtx = getOfflineAudioContext(...)`),
// so just importing magenta in a worker — even if you only intend to use
// MusicRNN.continueSequence — throws immediately.
//
// We don't use any audio-synthesis paths (we only call MusicRNN.continueSequence
// and sequences.quantizeNoteSequence — pure data operations). So returning null
// in worker context is safe: nothing downstream actually dereferences the result.
//
// This file is plugged in via vite.config.js (resolve.alias + an esbuild plugin
// for optimizeDeps pre-bundling, because esbuild's resolver doesn't honor
// Vite's regex aliases the same way Rollup does).
// =============================================================================

function getGlobalObject() {
  if (typeof globalThis !== 'undefined') return globalThis
  if (typeof self !== 'undefined') return self
  if (typeof window !== 'undefined') return window
  if (typeof global !== 'undefined') return global
  throw new Error('cannot find the global object')
}

const globalObject = getGlobalObject()

export const fetch = globalObject.fetch.bind(globalObject)
export const performance = globalObject.performance
export const navigator = globalObject.navigator
export const isSafari = !!globalObject.webkitOfflineAudioContext

export function getOfflineAudioContext(sampleRate) {
  const WEBKIT_SAMPLE_RATE = 44100
  sampleRate = isSafari ? WEBKIT_SAMPLE_RATE : sampleRate

  // No OfflineAudioContext API in Workers. Return null instead of throwing —
  // anything that actually tries to USE the result will fail loudly, but for
  // our flow (MusicRNN.continueSequence, quantizeNoteSequence) the result is
  // never dereferenced so this is fine.
  if (typeof globalObject.OfflineAudioContext === 'undefined' &&
      typeof globalObject.webkitOfflineAudioContext === 'undefined') {
    return null
  }

  const SafariOfflineCtx = globalObject.webkitOfflineAudioContext
  return isSafari
    ? new SafariOfflineCtx(1, sampleRate, sampleRate)
    : new globalObject.OfflineAudioContext(1, sampleRate, sampleRate)
}
