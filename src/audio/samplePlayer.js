const currentlyPlaying = new Map()
const pendingSources = new Set()

function track(bufferSource) {
  pendingSources.add(bufferSource)
  bufferSource.onended = () => pendingSources.delete(bufferSource)
}

export function cancelAllScheduled() {
  for (const src of pendingSources) {
    try { src.stop() } catch {}
    try { src.disconnect() } catch {}
  }
  pendingSources.clear()
  currentlyPlaying.clear()
}

/**
 * Schedule a sample to be played at an exact time.
 *
 * It is set up to imitate a single channel per sample, so that if the same sample is scheduled to play
 * a second time before the last time has played to the end, the second one will interrupt the first one.
 *
 * @param audioContext {AudioContext}
 * @param sample {AudioBufferSourceNode}
 * @param time {number}
 * @param gain {GainNode}
 * @param outputNode {AudioNode}
 */
export function playMonophonicSampleAt(audioContext, sample, time, gain = 1, outputNode) {
  if (!sample) return;

  // Only stop currently playing if we're scheduling for immediate playback
  // (within 50ms). For future scheduling (repeats), allow polyphonic playback.
  const now = audioContext.currentTime;
  const isImmediate = (time - now) < 0.05;

  if (isImmediate && currentlyPlaying.has(sample)) {
    try {
      const { bufferSource, gainNode } = currentlyPlaying.get(sample)
      stopWithFade(audioContext, bufferSource, gainNode)
    } catch {}
    currentlyPlaying.delete(sample)
  }

  let bufferSource = audioContext.createBufferSource()
  bufferSource.buffer = sample;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = gain;

  bufferSource.connect(gainNode);
  gainNode.connect(outputNode);

  bufferSource.start(time);
  track(bufferSource)

  // Only track as "currently playing" if it's immediate
  if (isImmediate) {
    currentlyPlaying.set(sample, { bufferSource, gainNode })
  }
}

/**
 * Schedule a sample to be played at an exact time.
 *
 * @param audioContext {AudioContext}
 * @param sample {AudioBufferSourceNode}
 * @param time {number}
 * @param gain {GainNode}
 * @param outputNode {AudioNode}
 */
export function playSampleAt(audioContext, sample, time, gain = 1, outputNode) {
  if (!sample) return;

  let bufferSource = audioContext.createBufferSource()
  bufferSource.buffer = sample;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = gain;

  bufferSource.connect(gainNode);
  gainNode.connect(outputNode);

  bufferSource.start(time);
  track(bufferSource)
}

function stopWithFade(audioContext, bufferSource, gainNode, fadeMs = 5) {
  const now = audioContext.currentTime;
  const fade = fadeMs / 1000;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(0.0001, now + fade);

  bufferSource.stop(now + fade + 0.001);
}