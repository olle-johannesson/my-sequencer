import Meyda from "meyda"
import {createFeatureMailboxViews, createNoiseSpectrumMailboxViews} from "../util/mailbox.js";
import {rmsFromSpectrum} from "../dsp/rms.js";
import {createConsecutiveGate} from "../util/consecutiveGate.js";

let previousBlock
let featureMailbox
let noiseMailbox
let spectrumSize

const NOISE_ALPHA = 0.05;
const NOISE_MARGIN = 3.0;
const MIN_NOISE_THRESHOLD = 1e-3;

let rmsThreshold = MIN_NOISE_THRESHOLD;
let noiseSpectrum = null;
let noiseRms = 0;
let recordingState = 0;

// hysteresis:
const START_FACTOR = 0.1;   // how far above noise to start
const STOP_FACTOR  = 0.1;   // how far above noise to keep going
const MIN_FRAMES_ABOVE = 1;  // frames above start threshold to trigger
const MIN_FRAMES_BELOW = 1; // frames below stop threshold to stop
const hysteresisGate = createConsecutiveGate(MIN_FRAMES_ABOVE, MIN_FRAMES_BELOW);


/**
 * Update the noise model with the current frame's amplitude spectrum.'
 * Also take the opportunity to update the noise threshold.
 *
 * @param amplitudeSpectrum {Float32Array}
 * @returns {Float32Array} the updated noise spectrum
 */
function updateNoiseModel(amplitudeSpectrum) {
  if (!noiseSpectrum) {
    noiseSpectrum = new Float32Array(amplitudeSpectrum);
  } else {
    const invA = 1 - NOISE_ALPHA;
    for (let i = 0; i < amplitudeSpectrum.length; i++) {
      noiseSpectrum[i] = invA * noiseSpectrum[i] + NOISE_ALPHA * amplitudeSpectrum[i];
    }
  }

  const currentNoiseRms = rmsFromSpectrum(noiseSpectrum);
  noiseRms = (1 - NOISE_ALPHA) * noiseRms + NOISE_ALPHA * currentNoiseRms;
  rmsThreshold = Math.max(MIN_NOISE_THRESHOLD, NOISE_MARGIN * noiseRms);
}

/**
 * Every once in a while (this is not time-critical), we update the noise spectrum mailbox
 * with the current noise model. The ambient noise surroundings probably don't change that often,
 * we can save some CPU cycles by updating it less frequently.
 * Even so, it DOES change, so we update it.
 *
 * It is important to write the value to the mailbox before incrementing the sequence counter.
 * Otherwise, the value may be read by the main thread before the sequence counter is incremented.
 * The sequence counter is used like a flag to indicate that the mailbox has been updated.
 * That's why the consumer reads it like this:
 *
 *    if (s !== this.seq) {
 *       this.value = this.featureMailbox.f32[0];
 *       this.seq = s;
 *     }
 */
function postNoiseModelToMailbox() {
  if (!noiseSpectrum || recordingState === 1) {
    return;
  }

  if (noiseSpectrum.length !== spectrumSize) {
    console.warn(`noise spectrum length mismatch (${noiseSpectrum.length} !== ${spectrumSize})`);
    return;
  }

  noiseMailbox.f32.set(noiseSpectrum, 0);
  const nextSeq = (Atomics.load(noiseMailbox.i32, 0) + 1) | 0;
  Atomics.store(noiseMailbox.i32, 0, nextSeq);
}

/**
 * As stated above, we don't need to update the noise spectrum too often.
 * Some magic-number interval is fine.
 */
setInterval(postNoiseModelToMailbox, 1000)

function recordingDecision(rms, flux) {
  const startThreshold = rmsThreshold * START_FACTOR;
  const stopThreshold  = rmsThreshold * STOP_FACTOR;
  const enterCond = rms > startThreshold && flux > 0.05;
  const exitCond  = rms < stopThreshold  || flux < 0.02;
  return hysteresisGate(enterCond, exitCond)
}

/**
 * So the worker has two (no, wait, three) jobs:
 * 1) extract features from the audio block (these will be used to side-chain filters that lie before the recorder)
 * 2) decide whether to record or not (this is the main job of the worker)
 * 3) keep an updated noise model, which is used to
 *    3.1) inform the decision to record or not
 *    3.2) suppress noise in the audio block in post-processing
 *
 * @param e
 * @returns {Promise<void>}
 */
onmessage = async (e) => {
  const { data } = e
  switch (data?.type) {

    // We have to initialize the noise model before we can start recording.
    // This means initializing views for the feature and noise mailboxes,
    // and setting the spectrum size (which is used to allocate the noise mailbox).
    case 'init': {
      featureMailbox = createFeatureMailboxViews(data.featureMailboxSAB)
      noiseMailbox = createNoiseSpectrumMailboxViews(data.noiseMailboxSAB, data.spectrumSize / 2)
      spectrumSize = data.spectrumSize / 2
      self.postMessage({type: 'ready'})
      break
    }

    // When audio data is received, we extract features using the current frame and the last one (flux is comparative).
    // Then we can decide whether to record or not based on the current RMS and spectral flux.
    // We also update the noise model with the current frame's amplitude spectrum.'
    // And finally, we write the extracted features and recording state to the feature mailbox.
    case 'data': {
      const block = data.audio;
      if (!previousBlock) { previousBlock = block; }

      let {
        spectralFlux,
        rms,
        spectralCentroid,
        spectralFlatness,
        amplitudeSpectrum
      } = Meyda.extract(
        [
          'spectralFlux',
          'rms',
          'spectralCentroid',
          'spectralFlatness',
          'amplitudeSpectrum'
        ],
        block,
        previousBlock
      );

      spectralFlux      = spectralFlux      || 0;
      rms               = rms               || 0;
      spectralCentroid  = spectralCentroid  || 0;
      spectralFlatness  = spectralFlatness  || 0;

      recordingState = recordingDecision(rms, spectralFlux);

      // Make sure we're not recording before updating the noise model.
      if ((recordingState === 0) && (rms < rmsThreshold)) {
        // console.log(rms.toFixed(4), rmsThreshold.toFixed(4))
        updateNoiseModel(amplitudeSpectrum);
      }

      featureMailbox.f32[0] = recordingState;
      featureMailbox.f32[1] = rms;
      featureMailbox.f32[2] = spectralCentroid;
      featureMailbox.f32[3] = spectralFlatness;

      const nextSeq = (Atomics.load(featureMailbox.i32, 0) + 1) | 0;
      Atomics.store(featureMailbox.i32, 0, nextSeq);

      previousBlock = block;
      break;
    }
  }
}

