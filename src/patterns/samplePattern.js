import {thunk} from "../util/thunk.js"
import {getNormallyDistributedNumber} from "../util/random.js"
import {playMonophonicSampleAt} from "../audio/samplePlayer.js"
import {audioConfig} from "../config.js"
import {nextModulation} from "./modulation.js"

let patternAge = 0
// `const` enforces the invariant that the looper relies on: the reference is
// captured at startLoop and must stay stable. Mutate slots in place instead.
const scheduledSamples = [...new Array(16)].map(() => new Set())

export { scheduledSamples as samplePattern, patternAge as samplePatternAge }

// Stddev of the per-hit gain wobble. Higher than drums because recorded
// samples are inherently more varied — a bit of human-factor sounds
// natural here; on drum-machine samples it'd just sound sloppy.
const HUMAN_FACTOR_STDDEV = 0.05

/**
 * Curried scheduler for the looper's `scheduleSamples` callback. Pass the
 * audio context + output node at startLoop time; the returned function
 * handles one step's worth of sample playback.
 *
 * Pitched samples walk their pentatonic modulation table here via
 * `nextModulation`; non-pitched ones return undefined and play whole-buffer
 * at natural rate.
 */
export const scheduleAt = (audioContext, outputNode) => (time, samples, stepGain) => {
  samples
    .map(thunk)
    .filter(f => f instanceof AudioBuffer)
    .forEach(sample => {
      const gain = audioConfig.baseGain * stepGain + getNormallyDistributedNumber(0, HUMAN_FACTOR_STDDEV)
      const modulation = nextModulation(sample)
      playMonophonicSampleAt(audioContext, sample, time, gain, outputNode, modulation)
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
