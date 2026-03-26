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
    latencyHint: 'interactive'
  });
}

export function loadAudioWorklets(audioContext) {
  return Promise.all([
    audioContext.audioWorklet.addModule('/src/worklets/tap.worklet.js'),
    audioContext.audioWorklet.addModule('/src/worklets/analysis-reader.worklet.js'),
    audioContext.audioWorklet.addModule('/src/worklets/recorder.worklet.js'),
    audioContext.audioWorklet.addModule('/src/worklets/bitcrusher.worklet.js'),
    audioContext.audioWorklet.addModule('/src/worklets/grain-player.worklet.js'),
    audioContext.audioWorklet.addModule('/src/worklets/pitchshift.worklet.js'),
  ])
}

export async function pauseAudioContext(audioContext) {
  if (!audioContext) {
    return null
  }
  await audioContext.suspend();
  return audioContext;
}
