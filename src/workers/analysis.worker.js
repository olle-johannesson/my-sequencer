import Meyda from "meyda"
import {createFeatureMailboxViews, createNoiseSpectrumMailboxViews} from "../util/mailbox.js";

let previousBlock
let featureMailbox
let noiseMailbox
let spectrumSize
let rmsThreshold = 1e-3
let noiseSpectrum = null
const ALPHA = 0.05

function updateNoiseModel(amplitudeSpectrum) {
  if (!noiseSpectrum) {
    noiseSpectrum = new Float32Array(amplitudeSpectrum);
    return;
  }

  const invA = 1 - ALPHA;
  for (let i = 0; i < amplitudeSpectrum.length; i++) {
    noiseSpectrum[i] = invA * noiseSpectrum[i] + ALPHA * amplitudeSpectrum[i];
  }

  return noiseSpectrum;
}

function updateNoiseSpectrum() {
  if (!noiseSpectrum) {
    return
  }

  if (noiseSpectrum.length !== undefined && (noiseSpectrum.length !== spectrumSize)) {
    console.error('noiseSpectrum length mismatch', noiseSpectrum.length, spectrumSize)
    return noiseSpectrum
  }

  noiseMailbox.f32.set(updateNoiseModel(noiseSpectrum), 0)
  const nextSeq = (Atomics.load(noiseMailbox.i32, 0) + 1) | 0
  Atomics.store(noiseMailbox.i32, 0, nextSeq)
}

setInterval(updateNoiseSpectrum, 500)

function isNovel(flux, rms) {
  return (rms > rmsThreshold) && (flux > 0.05);
}

/**
 * It is important to write the value to mailbox before incrementing the sequence counter.
 * Otherwise, the value may be read by the main thread before the sequence counter is incremented.
 * The sequence counter is used like a flag to indicate that the mailbox has been updated.
 * That's why the consumer reads it like this:
 *
 *    if (s !== this.seq) {
 *       this.value = this.featureMailbox.f32[0];
 *       this.seq = s;
 *     }
 * @param v
 */
onmessage = async (e) => {
  const { data } = e
  switch (data?.type) {
    case 'init': {
      featureMailbox = createFeatureMailboxViews(data.featureMailboxSAB)
      noiseMailbox = createNoiseSpectrumMailboxViews(data.noiseMailboxSAB, data.spectrumSize / 2)
      spectrumSize = data.spectrumSize / 2
      self.postMessage({type: 'ack'})
      break
    }

    case ('data'): {
      const block = data.audio
      if (!previousBlock) { previousBlock = block }
      let {
        spectralFlux,
        rms,
        spectralCentroid,
        spectralFlatness,
        amplitudeSpectrum
      } = Meyda.extract([
        'spectralFlux',
        'rms',
        'spectralCentroid',
        'spectralFlatness',
        'amplitudeSpectrum'],
        block,
        previousBlock
      );

      const shouldRecord = isNovel(spectralFlux, rms)

      if (!shouldRecord && rms < rmsThreshold) {
        updateNoiseModel(amplitudeSpectrum);
      }

      featureMailbox.f32[0] = shouldRecord;
      featureMailbox.f32[1] = rms || 0;
      featureMailbox.f32[2] = spectralCentroid || 0;
      featureMailbox.f32[3] = spectralFlatness || 0;
      const nextSeq = (Atomics.load(featureMailbox.i32, 0) + 1) | 0

      Atomics.store(featureMailbox.i32, 0, nextSeq)
      previousBlock = block;
      break;
    }
  }
}
