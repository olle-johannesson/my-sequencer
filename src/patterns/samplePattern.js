import {thunk} from "../util/thunk.js"
import {getNormallyDistributedNumber} from "../util/random.js"
import {audioConfig, STEPS_PER_BAR} from "../config.js"
import {nextModulation} from "./modulation.js"

let patternAge = 0
// `const` enforces the invariant that the looper relies on: the reference is
// captured at startLoop and must stay stable. Mutate slots in place instead.
const scheduledSamples = [...new Array(STEPS_PER_BAR)].map(() => new Set())

export { scheduledSamples as samplePattern, patternAge as samplePatternAge }

/**
 * Curried scheduler for the looper's `scheduleSamples` callback. The
 * caller wires in the audio context, the output node, and the `play`
 * function it wants used — playback is a side-effecting dependency, so
 * it's explicit rather than imported here.
 *
 * Pitched samples walk their pentatonic modulation table here via
 * `nextModulation`; non-pitched ones return undefined and play whole-buffer
 * at natural rate.
 */
export const scheduleAt = (audioContext, outputNode, play) => (time, samples, stepGain) => {
  samples
    .map(thunk)
    .filter(f => f instanceof AudioBuffer)
    .forEach(sample => {
      const gain = audioConfig.baseGain * stepGain + getNormallyDistributedNumber(0, audioConfig.humanFactor.samples)
      const modulation = nextModulation(sample)
      play(audioContext, sample, time, gain, outputNode, modulation)
    })
}

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
