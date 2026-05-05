// =============================================================================
// Input level meter — reads RMS from the analysis worker's feature SAB and
// drives the <meter id="input-meter"> element on every animation frame.
// =============================================================================
//
// VU-style ballistics: fast attack (snap up to peaks), slow release (decay
// gracefully). This is what makes a meter "feel" right — a strict instantaneous
// reading would jitter wildly even on a steady input.
//
// We poll via rAF rather than acting on every analysis-worker post because
// (a) frames are 60 Hz, blocks are ~43 Hz, so we rarely miss data, and
// (b) the SAB read is a single Atomics.load + a Float32Array index — cheap.
// =============================================================================

import {createFeatureMailboxViews} from '../util/mailbox.js'
import {inputMeter} from './uiHandles.js'
import {meterConfig} from '../config.js'

const RMS_INDEX = 1    // featureMailbox.f32[1] holds the latest RMS

let mailbox
let meterEl
let lastSeq = 0
let displayed = 0
let running = false

export function setupInputMeter(audioFeatureSAB) {
  mailbox = createFeatureMailboxViews(audioFeatureSAB)
  meterEl = inputMeter()
  if (!meterEl || running) return
  running = true
  requestAnimationFrame(tick)
}

function tick() {
  if (!running || !mailbox || !meterEl) return

  const seq = Atomics.load(mailbox.i32, 0)
  if (seq !== lastSeq) {
    // New data arrived since last frame.
    lastSeq = seq
    const rms = mailbox.f32[RMS_INDEX]
    if (rms > displayed) {
      // Fast attack — peak holds.
      displayed = displayed * (1 - meterConfig.attack) + rms * meterConfig.attack
    } else {
      // Slow release — gracefully fall toward the new (lower) reading.
      displayed = displayed * meterConfig.release + rms * (1 - meterConfig.release)
    }
  } else {
    // No new analysis data this frame — keep decaying so the meter doesn't
    // sit stuck at the last value when audio stops.
    displayed *= meterConfig.release
  }

  meterEl.value = displayed
  requestAnimationFrame(tick)
}
