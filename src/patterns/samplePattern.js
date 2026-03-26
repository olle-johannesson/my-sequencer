let scheduledSamples = [...new Array(16)].map(() => new Set())

export { scheduledSamples as samplePattern }

/**
 * Schedule a new sample to be played
 * @param index {number}
 * @param sample {AudioBuffer}
 */
export function scheduleSample(index, sample) {
  scheduledSamples[index].add(sample);
}

/**
 * Clear a sample from the playing schedule
 * @param sample {AudioBuffer}
 */
export function clearSample(sample) {
  scheduledSamples.forEach(slot => slot.delete(sample));
}

/**
 * Remove all samples from the playing schedule
 */
export function clearAllSamples() {
  scheduledSamples = [...new Array(16)].map(() => new Set())
}
