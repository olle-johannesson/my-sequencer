let patternAge = 0
// `const` enforces the invariant that the looper relies on: the reference is
// captured at startLoop and must stay stable. Mutate slots in place instead.
const scheduledSamples = [...new Array(16)].map(() => new Set())

export { scheduledSamples as samplePattern, patternAge as samplePatternAge }

/**
 * Schedule a new sample to be played
 * @param index {number}
 * @param sample {AudioBuffer}
 */
export function scheduleSample(index, sample) {
  scheduledSamples[index].add(sample);
  patternAge = 0
}

/**
 * Clear a sample from the playing schedule
 * @param sample {AudioBuffer}
 */
export function clearSample(sample) {
  scheduledSamples.forEach(slot => slot.delete(sample));
  patternAge = 0
}

/**
 * Remove all samples from the playing schedule
 */
export function clearAllSamples() {
  for (const slot of scheduledSamples) slot.clear()
  patternAge = 0
}

export function incrementPatternAge() {
  patternAge = patternAge + 1
}
