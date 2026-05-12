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
 * @param sample {AudioBuffer}
 * @param time {number}
 * @param gain {number}
 * @param outputNode {AudioNode}
 * @param modulation {{offset?: number, duration?: number, playbackRate?: number}=}
 *   Per-trigger overrides for chopping / pitch-shifting (e.g. sustained pitched
 *   samples played at pentatonic offsets). Omitted → plays the whole sample at
 *   its natural rate from sample-time 0, same as before.
 */
export function playMonophonicSampleAt(audioContext, sample, time, gain = 1, outputNode, modulation) {
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

  const bufferSource = audioContext.createBufferSource()
  bufferSource.buffer = sample;
  if (modulation?.playbackRate !== undefined) {
    bufferSource.playbackRate.value = modulation.playbackRate
  }

  const gainNode = audioContext.createGain();
  gainNode.gain.value = gain;

  bufferSource.connect(gainNode);
  gainNode.connect(outputNode);

  const offset = modulation?.offset ?? 0
  if (modulation?.duration !== undefined) {
    bufferSource.start(time, offset, modulation.duration)
  } else {
    bufferSource.start(time, offset)
  }
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
 * @param sample {AudioBuffer}
 * @param time {number}
 * @param gain {number}
 * @param outputNode {AudioNode}
 * @param modulation {{offset?: number, duration?: number, playbackRate?: number}=}
 */
export function playSampleAt(audioContext, sample, time, gain = 1, outputNode, modulation) {
  if (!sample) return;

  const bufferSource = audioContext.createBufferSource()
  bufferSource.buffer = sample;
  if (modulation?.playbackRate !== undefined) {
    bufferSource.playbackRate.value = modulation.playbackRate
  }

  const gainNode = audioContext.createGain();
  gainNode.gain.value = gain;

  bufferSource.connect(gainNode);
  gainNode.connect(outputNode);

  const offset = modulation?.offset ?? 0
  if (modulation?.duration !== undefined) {
    bufferSource.start(time, offset, modulation.duration)
  } else {
    bufferSource.start(time, offset)
  }
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