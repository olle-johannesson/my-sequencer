import tapWorkletUrl from '../worklets/tap.worklet.js?worker&url'
import analysisReaderWorkletUrl from '../worklets/analysis-reader.worklet.js?worker&url'
import recorderWorkletUrl from '../worklets/recorder.worklet.js?worker&url'
import bitcrusherWorkletUrl from '../worklets/bitcrusher.worklet.js?worker&url'
import grainPlayerWorkletUrl from '../worklets/grain-player.worklet.js?worker&url'
import pitchshiftWorkletUrl from '../worklets/pitchshift.worklet.js?worker&url'

/**
 * Create an audio context and load all the worklets
 */
export async function setupAudioContext() {
  const audioContext = startAudioContext()
  await loadAudioWorklets(audioContext)
  return audioContext;
}

export function startAudioContext() {
  return new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: 'playback'
    // TODO: setting?
    // latencyHint: 'interactive'
  });
}

export function loadAudioWorklets(audioContext) {
  return Promise.all([
    audioContext.audioWorklet.addModule(tapWorkletUrl),
    audioContext.audioWorklet.addModule(analysisReaderWorkletUrl),
    audioContext.audioWorklet.addModule(recorderWorkletUrl),
    audioContext.audioWorklet.addModule(bitcrusherWorkletUrl),
    audioContext.audioWorklet.addModule(grainPlayerWorkletUrl),
    audioContext.audioWorklet.addModule(pitchshiftWorkletUrl),
  ])
}

export async function pauseAudioContext(audioContext) {
  if (!audioContext) {
    return null
  }
  await audioContext.suspend();
  return audioContext;
}
