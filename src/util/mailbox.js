// Slot layout (Float32):
//   [0] recordingState (0 or 1, driven by the analysis worker's gate)
//   [1] rms
//   [2] spectralCentroid
//   [3] spectralFlatness
// Reader (analysis-reader worklet) checks the Int32 seq counter for freshness.
// If you add a slot, bump FEATURE_COUNT *and* update the writer in
// analysis.worker.js — the SAB layout is shared, not policed.
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
