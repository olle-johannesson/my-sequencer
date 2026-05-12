import {setDiagnostic, sparkline} from "./messages.js";
import {controlsPanel} from "./uiHandles.js";

const CLASSIFICATION_COLORS = {
  BASSY:        '#5a9',
  RUMBLY_LOW:   '#5a9',
  RUMBLY_MID:   '#5a9',
  RUMBLY_HIGH:  '#5a9',
  SNAPPY:       '#e95',
  PERCUSSIVE:   '#e95',
  BRIGHT:       '#9bd',
  AIRY:         '#9bd',
  CYMBAL_CRASH: '#9bd',
  SUSTAINED:    '#a7e',
}

export const classificationColor = c => CLASSIFICATION_COLORS[c] ?? '#aaa'

const FIGURE_KEYS = [
  'outputLatency ms',
  'baseLatency ms',
  'sampleRate',
  'main thread stalls/1s',
  'analysis avg ms',
  'analysis max ms',
  'analysis blocks/0.5s',
  'inter-msg avg ms',
]

const SAMPLE_SLOTS = 5
let sampleSlotIndex = 0

export function setupMonitoringPanel() {
  for (const key of FIGURE_KEYS) {
    setDiagnostic(key, '—', 'rgba(128,128,128,0.7)')
  }
  resetSampleSlots()
}

/**
 * Reset the recorded-sample diagnostic rows back to "empty". Called on stop
 * so the panel doesn't keep displaying samples from a session that's no
 * longer playing.
 */
export function resetSampleSlots() {
  sampleSlotIndex = 0
  for (let i = 0; i < SAMPLE_SLOTS; i++) {
    setDiagnostic(`sample ${i}`, '— empty —', 'rgba(128,128,128,0.4)')
  }
}

export function showSampleInSlot(classification, features, color) {
  const items = [
    {value: features.duration,         max: 2},
    {value: features.decayTime,        max: 1},
    {value: features.lowRatio,         max: 1},
    {value: features.highRatio,        max: 1},
    {value: features.centroid, max: 10000},
    {value: features.flatness, max: 1},
  ]
  const slot = sampleSlotIndex % SAMPLE_SLOTS
  sampleSlotIndex++
  setDiagnostic(`sample ${slot}`, `${classification.padEnd(13)} ${sparkline(items)}`, color)
}

export function surfaceStartError(e) {
  let msg
  switch (e?.name) {
    case 'NotAllowedError':
      msg = 'Microphone access denied. Allow it in your browser settings to enable recording.'
      break
    case 'NotFoundError':
      msg = 'No microphone found. Connect an input device and try again.'
      break
    case 'NotReadableError':
      msg = 'Microphone is in use by another app. Close it and try again.'
      break
    default:
      msg = `Could not start: ${e?.message || e}`
  }
  setDiagnostic('start error', msg, '#f55')
  controlsPanel()?.setAttribute('open', '')
}
