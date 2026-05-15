// Slot layout (Float32):
//   [0] recordingState (0 or 1, driven by the analysis worker's gate)
//   [1] rms
//   [2] spectralCentroid
//   [3] spectralFlatness
// Reader (analysis-reader worklet) checks the Int32 seq counter for freshness.
// If you add a slot, bump FEATURE_COUNT *and* update the writer in
// analysis.worker.js — the SAB layout is shared, not policed.
//
// The seq counter is an Int32 advanced by `(s + 1) | 0` after every write, so
// it wraps cleanly at ~2.1B. Readers compare for inequality (not >), which
// stays correct across the wrap. At the analysis worker's ~43 Hz block rate
// that's roughly 1.6 years of continuous running before a single wrap —
// noted, not handled.
export const FEATURE_COUNT = 4;

export function createFeatureMailboxViews(sharedArrayBuffer) {
  return {
    i32: new Int32Array(sharedArrayBuffer, 0, 1),                          // seq
    f32: new Float32Array(sharedArrayBuffer, Int32Array.BYTES_PER_ELEMENT, FEATURE_COUNT), // features
  };
}
export function createNoiseSpectrumMailboxViews(sharedArrayBuffer, spectrumSize = 256) {
  return {
    i32: new Int32Array(sharedArrayBuffer, 0, 1),
    f32: new Float32Array(sharedArrayBuffer, Int32Array.BYTES_PER_ELEMENT, spectrumSize),
  }
}
