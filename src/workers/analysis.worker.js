import Meyda from "meyda"
import {createFeatureMailboxViews, createNoiseSpectrumMailboxViews} from "../util/mailbox.js";
import {rmsFromSpectrum} from "../dsp/rms.js";
import {createConsecutiveGate} from "../util/consecutiveGate.js";
import {matchDiscardProfile} from "../dsp/discardProfiles.js";
import {recordingConfig} from "../config.js";

let previousBlock
let featureMailbox
let noiseMailbox
let spectrumSize

let rmsThreshold = recordingConfig.minNoiseThreshold;
let noiseSpectrum = null;
let noiseRms = 0;
let recordingState = 0;
let calibrationFrames = 0;

// Loudest RMS observed during the current take. Reset to 0 every time
// recording starts (state 0 → 1) and grown monotonically while recording.
// Used by recordingDecision to compute a peak-relative stop threshold.
let recordingPeakRms = 0;

// Per-take stats used to detect "this is a sustained take" early on, then
// extend the hysteresis exit window for the rest of the take so vibrato /
// breath dips don't cut it off. We watch spectral flatness rather than flux
// because vocals can be fluxy (vibrato) but stay tonal (low flatness).
let recordingFrameCount = 0;
let recordingFlatnessSum = 0;
let currentExitLimit = recordingConfig.minFramesBelow;

const hysteresisGate = createConsecutiveGate(
  recordingConfig.minFramesAbove,
  recordingConfig.minFramesBelow,
);

// User-adjustable scale on the noise-relative thresholds. 1.0 = default;
// lower values = less sensitive (need more signal above noise to trigger),
// higher values = more sensitive. Driven from the Input sensitivity slider.
let sensitivityMultiplier = 1.0;


/**
 * Update the noise model with the current frame's amplitude spectrum.'
 * Also take the opportunity to update the noise threshold.
 *
 * @param amplitudeSpectrum {Float32Array}
 * @returns {Float32Array} the updated noise spectrum
 */
function updateNoiseModel(amplitudeSpectrum) {
  const alpha = recordingConfig.noiseAlpha;
  if (!noiseSpectrum) {
    noiseSpectrum = new Float32Array(amplitudeSpectrum);
  } else {
    const invA = 1 - alpha;
    for (let i = 0; i < amplitudeSpectrum.length; i++) {
      noiseSpectrum[i] = invA * noiseSpectrum[i] + alpha * amplitudeSpectrum[i];
    }
  }

  const currentNoiseRms = rmsFromSpectrum(noiseSpectrum);
  noiseRms = (1 - alpha) * noiseRms + alpha * currentNoiseRms;
  rmsThreshold = Math.max(recordingConfig.minNoiseThreshold, recordingConfig.noiseMargin * noiseRms);
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

// rolling timing — posted up to main thread periodically so we can render it on-screen.
let lastTickTime = null
let interMessageMs = 0
let extractMs = 0
let blocksProcessed = 0
let extractMaxMs = 0

setInterval(() => {
  if (blocksProcessed === 0) return
  self.postMessage({
    type: 'timing',
    extractAvgMs: extractMs / blocksProcessed,
    extractMaxMs,
    interMessageAvgMs: interMessageMs / blocksProcessed,
    blocksProcessed,
  })
  interMessageMs = 0
  extractMs = 0
  blocksProcessed = 0
  extractMaxMs = 0
}, 500)

/**
 * Deciding whether to record or not.
 * To start recording, the rms must be higher than a set minimum (adapted
 * by the noise level), and the spectral flux must exceed some set level.
 *
 * To stop recording, the rms must be below some similar threshold (adapted
 * by the noise level), but not depend on flux. Otherwise, sustained tones might
 * experience decreasing flux and cause false negatives. As long as we're above the
 * noise floor, we'll assume that we're recording something interesting.
 *
 * This is then passed though as hysteresis gate to ramp our starts and stops.
 *
 * @param rms {number}
 * @param flux {number}
 * @return {number}
 */
function recordingDecision(rms, flux, flatness, centroid) {
  // Higher sensitivity = lower threshold (so quieter input triggers).
  // Multiplier is inverse: 4x more sensitive halves the threshold.
  const startThreshold = rmsThreshold * recordingConfig.startFactor / sensitivityMultiplier;
  const noiseRelativeStop = rmsThreshold * recordingConfig.stopFactor / sensitivityMultiplier;

  // Track the loudest moment of *this take* and stop when the level falls
  // below that fraction. Combined with the noise-relative stop via max() —
  // so loud takes have to drop way below their own peak before they cut
  // (full release tail), while quiet takes still terminate at the noise
  // floor as before.
  if (recordingState === 1 && rms > recordingPeakRms) recordingPeakRms = rms;
  const peakRelativeStop = recordingPeakRms * recordingConfig.peakStopFraction;
  const stopThreshold = Math.max(noiseRelativeStop, peakRelativeStop);

  // Sustained-take detection: accumulate spectral flatness for the first
  // sustainedDetectFrames frames; right at that point, lift the gate's
  // exit window if the take has been tonal (low flatness = sparse spectrum
  // = voice / sustained synth). Voice can be fluxy from vibrato yet stay
  // tonal, which is why flatness is the better signal here.
  if (recordingState === 1) {
    recordingFrameCount++;
    recordingFlatnessSum += flatness;
    if (recordingFrameCount === recordingConfig.sustainedDetectFrames) {
      const avgFlatness = recordingFlatnessSum / recordingFrameCount;
      currentExitLimit = avgFlatness < recordingConfig.sustainedFlatnessThreshold
        ? recordingConfig.sustainedExitFrames
        : recordingConfig.minFramesBelow;
    }
  }

  // Reject if any DISCARD_PROFILE matches the current frame's features.
  // Profiles needing post-classify-only features (lowRatio, decayTime, …)
  // never match here — those undefined values fail every comparison.
  const junk = matchDiscardProfile({rms, flux, flatness, centroid})
  const enterCond = !junk && rms > startThreshold && flux > 0.05;
  const exitCond  = rms < stopThreshold //  || flux < 0.02;
  const next = hysteresisGate(enterCond, exitCond, undefined, currentExitLimit)

  // Reset per-take state when recording finishes, so the next take starts
  // fresh.
  if (recordingState === 1 && next === 0) {
    recordingPeakRms = 0;
    recordingFrameCount = 0;
    recordingFlatnessSum = 0;
    currentExitLimit = recordingConfig.minFramesBelow;
  }
  return next
}

/**
 * So the worker has two (no, wait, three) jobs:
 * 1) extract features from the audio block (these will be used to side-chain filters that lie before the recorder)
 * 2) decide whether to record or not (this is the main job of the worker)
 * 3) keep an updated noise model, which is used to
 *    3.1) inform the decision to record or not
 *    3.2) suppress noise in the audio block in post-processing
 *
 * The worker receives audio blocks using message posting. This is fine as
 * long as we're using block sizes like 1024 and 44.1 kHz. If posting gets
 * more frequent than the time it takes to analyze them, we'll get lag,
 * and then we should switch to SAB ring queues or something, and that's too
 * much work for now. Let's just keep the quality reasonably low instead.
 *
 * @param e {MessageEvent}
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

    // Updates the sensitivity multiplier used inside recordingDecision.
    // Safe to receive before 'init' — it just sets a top-level variable.
    case 'sensitivity': {
      sensitivityMultiplier = data.multiplier
      break
    }

    // When audio data is received, we extract features using the current frame and the last one (flux is comparative).
    // Then we can decide whether to record or not based on the current RMS and spectral flux.
    // We also update the noise model with the current frame's amplitude spectrum.'
    // And finally, we write the extracted features and recording state to the feature mailbox.
    case 'data': {
      const block = data.audio;
      const now = performance.now()
      if (lastTickTime !== null) interMessageMs += (now - lastTickTime)
      lastTickTime = now
      const t0 = now

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

      // Calibration period: force recording off for the first ~1 s of the
      // worker's life so the noise model gets a clean baseline. Sticky —
      // once we cross the threshold this branch is dead for the rest of
      // the worker's lifetime, including across user start/stop cycles
      // (the worker persists between sessions). The hysteresis gate state
      // similarly persists; if you ever start tearing the worker down on
      // stop(), reset both here.
      if (calibrationFrames < 40) {
        calibrationFrames++;
        recordingState = 0;
      } else {
        recordingState = recordingDecision(rms, spectralFlux, spectralFlatness, spectralCentroid);
      }

      // Make sure we're not recording before updating the noise model.
      if ((recordingState === 0) && (rms < rmsThreshold)) {
        updateNoiseModel(amplitudeSpectrum);
      }

      featureMailbox.f32[0] = recordingState;
      featureMailbox.f32[1] = rms;
      featureMailbox.f32[2] = spectralCentroid;
      featureMailbox.f32[3] = spectralFlatness;

      const nextSeq = (Atomics.load(featureMailbox.i32, 0) + 1) | 0;
      Atomics.store(featureMailbox.i32, 0, nextSeq);

      previousBlock = block;

      const dt = performance.now() - t0
      extractMs += dt
      if (dt > extractMaxMs) extractMaxMs = dt
      blocksProcessed++

      break;
    }
  }
}

