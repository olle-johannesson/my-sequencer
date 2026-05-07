// =============================================================================
// Tuning knobs. The values here change the system's *behaviour* — pacing,
// sensitivity, drift — not its UI or implementation details.
//
// Module-local magic numbers (UI sizes, internal velocities, BPM presets,
// etc.) deliberately stay near their consumers. The bar for inclusion here
// is "another developer might reasonably want to retune this without reading
// the calling code".
// =============================================================================

// --- Audio analysis pipeline -----------------------------------------------
export const analysisBlockSize = 1024;
export const spectrumSize = analysisBlockSize / 2;

// --- Looper / scheduler ----------------------------------------------------
export const audioConfig = {
  // How far ahead of `audioContext.currentTime` we keep scheduling. Bigger
  // = more robust against main-thread stalls but worse latency for last-
  // moment changes (effect swaps, etc.). Chris-Wilson's classic ~100 ms.
  scheduleAheadTime: 0.1,

  // If the scheduler wakes up further than this many steps behind real time
  // (i.e. tab was throttled), snap to "now" instead of catching up step-by-
  // step — otherwise we'd run beforeEachCycle once per missed bar and queue
  // a flurry of magenta inferences.
  maxCatchupSteps: 4,

  // Base mixer level applied to every scheduled hit before per-step velocity
  // and the random "human factor" multiplier.
  baseGain: 0.8,
};

// --- Creep — controls how the loop drifts when nothing fresh happens ------
export const creepConfig = {
  // Magenta sampling temperature ramps from base + 0 (musical) to
  // base + range (chaotic) over tempHalfBars worth of bars.
  tempBase: 1.0,
  tempRange: 1.0,
  tempHalfBars: 32,

  // Per-bar probability that the effect pattern mutates. Climbs from 0 to
  // fxMaxChance over fxHalfBars.
  fxMaxChance: 0.5,
  fxHalfBars: 64,

  // Per-bar probability of "snapping back" to the original seed pattern,
  // used to exhale after a long drift.
  revertMaxChance: 0.4,
  revertHalfBars: 66,
};

// --- Recording trigger — start/stop detection in the analysis worker -----
export const recordingConfig = {
  // Multiplier on the noise floor for the start/stop hysteresis. Lower
  // means more sensitive (records quieter input). The Input-sensitivity
  // slider scales these at runtime.
  startFactor: 0.125,
  stopFactor: 0.12,

  // Adaptive stop: stop the recording once the level drops below this
  // fraction of the loudest moment seen *during this take*. Combined with
  // the static noise-relative stop via max() — so loud takes need to drop
  // way below their own peak before they end (capturing the full release
  // tail), while quiet takes still get the tight noise-floor cut.
  peakStopFraction: 0.05,

  // Hysteresis frame counts for the consecutive-gate. minFramesBelow is the
  // *default* — sustained takes get extended to sustainedExitFrames once
  // they've been recognised as such within the first sustainedDetectFrames.
  // Sustained = tonal source (voice / sustained synth). Detected via
  // spectral flatness, which is far more reliable than flux for voice
  // (vibrato / articulation can push flux high even on a held note, but
  // flatness stays low because the spectrum is sparse).
  minFramesAbove: 1,
  minFramesBelow: 2,
  sustainedExitFrames: 14,
  sustainedFlatnessThreshold: 0.15, // avg flatness below this => sustained
  sustainedDetectFrames: 5,

  // Exponential smoothing on the noise model, plus the safety margin
  // applied when computing the rms threshold from the noise.
  noiseAlpha: 0.05,
  noiseMargin: 3.0,
  minNoiseThreshold: 1e-3,
};

// --- Input meter ballistics ------------------------------------------------
export const meterConfig = {
  // 1.0 = instantly snap to peaks (no smoothing on rise).
  attack: 1.0,
  // Per-frame multiplier on the displayed level when no fresh data arrives.
  // 0.92 → ~30 frames to fall to 10%.
  release: 0.92,
};
