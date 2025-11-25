export const FEATURE_COUNT = 4; // novelty, rms, centroid, flatness

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
