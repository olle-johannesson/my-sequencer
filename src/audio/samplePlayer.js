// Per-AudioBuffer: the most recently scheduled monophonic source. Used so
// each new scheduled play of the same buffer fades out its predecessor
// ending exactly at the new start time — universal monophonic across both
// immediate retriggers and look-ahead-scheduled hits.
const lastMonophonic = new Map()

// Every scheduled source (mono + poly) so cancelAllScheduled can rip them all.
const pendingSources = new Set()

function track(bufferSource) {
  pendingSources.add(bufferSource)
  bufferSource.addEventListener('ended', () => pendingSources.delete(bufferSource))
}

export function cancelAllScheduled() {
  for (const src of pendingSources) {
    try { src.stop() } catch {}
    try { src.disconnect() } catch {}
  }
  pendingSources.clear()
  lastMonophonic.clear()
}

// "Lil crossfade" — fade applied to the previous monophonic source when a
// new one replaces it. 20 ms kills clicks at rate boundaries while keeping
// the new note's attack intact (no fade-in on the new source).
const FADE_MS = 20

function scheduleFadeOut(audioContext, bufferSource, gainNode, endTime) {
  const fadeSec = FADE_MS / 1000
  const fadeStart = Math.max(audioContext.currentTime, endTime - fadeSec)
  try {
    gainNode.gain.cancelScheduledValues(fadeStart)
    gainNode.gain.setValueAtTime(gainNode.gain.value, fadeStart)
    gainNode.gain.linearRampToValueAtTime(0.0001, endTime)
    bufferSource.stop(endTime + 0.001)
  } catch {}
}

/**
 * Schedule a sample to be played at an exact time.
 *
 * Universal monophonic: any previously-scheduled play of this same buffer
 * — whether already in progress or still queued for the future — is faded
 * out ending exactly at `time`. New playback starts at full gain at `time`.
 *
 * @param audioContext {AudioContext}
 * @param sample {AudioBuffer}
 * @param time {number}
 * @param gain {number}
 * @param outputNode {AudioNode}
 * @param modulation {{offset?: number, duration?: number, playbackRate?: number}=}
 *   Per-trigger overrides for chopping / pitch-shifting (e.g. sustained pitched
 *   samples played at pentatonic offsets). Omitted → plays the whole sample at
 *   its natural rate from sample-time 0.
 */
export function playMonophonicSampleAt(audioContext, sample, time, gain = 1, outputNode, modulation) {
  if (!sample) return;

  const prev = lastMonophonic.get(sample)
  if (prev && prev.startTime < time) {
    scheduleFadeOut(audioContext, prev.bufferSource, prev.gainNode, time)
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

  // Remember as the active source so the next call can fade it out cleanly.
  // Clear the entry when it ends naturally so we don't try to fade a
  // stopped node on the following play.
  const record = { bufferSource, gainNode, startTime: time }
  lastMonophonic.set(sample, record)
  bufferSource.addEventListener('ended', () => {
    if (lastMonophonic.get(sample) === record) {
      lastMonophonic.delete(sample)
    }
  })
}

/**
 * Schedule a sample to be played at an exact time. Polyphonic — used for
 * drums where multiple hits can stack on the same step (kick + snare + hat).
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
