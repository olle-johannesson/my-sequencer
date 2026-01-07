import {continuePattern} from "./magentaHelper.js";
import {getNormallyDistributedNumber} from "./util/random.js";
import {evenlySpacedPartitions} from "./util/evenlySpacedPartitions.js";

const maxAttemptsToScheduleNewSample = 5
const maxSamples = 5
let nextSample = 0

// DrumsRNN-friendly “filler” pitches
const ghostPitches = [
  45, // Low Tom
  48, // Mid Tom
  50, // High Tom
  42, // Closed Hat (nice as a “clicky” filler)
  46, // Open Hat
  49, // Crash
  51, // Ride
];

/**
 * @type {*[{ pitch: number, sample: AudioBuffer }][]}
 */
let pattern = [
  [],[],[],[],
  [],[],[],[],
  [],[],[],[],
  [],[],[],[]
]





/**
 * Use magenta to add a new sample to the pattern and schedule them to be played.
 * If the number of samples have reached its limit, the oldest sample in the pattern will be retired.
 *
 * This works by using the old pattern as a seed, adding a "ghost pitch" at some boring positions, and letting
 * magenta continue the pattern. Then we extract the onset times for the ghost pitch from the resulting
 * pattern and adding it to our old one.
 *
 * The ghost pitches are selected to be such representing good "filler" drums, like toms and ride and such,
 * that magenta will probably do something cool with.
 *
 * After we have used all the ghost pitches we start to recycle them.
 *
 * @param sample
 * @param scheduleSample {(index: number, sample: AudioBuffer) => void}
 * @param clearSample {(sample: AudioBuffer) => void}
 */
export async function addNewRecordedSample(sample, scheduleSample, clearSample) {
  const index = ++nextSample % maxSamples
  const ghostPitch = ghostPitches[index]

  pattern = clearPitchFromPattern(ghostPitch, pattern, clearSample)
  const seed = makeSeedWithGhostPitchFromPattern(ghostPitch, pattern, 2);
  const quantizedStartSteps = await getQuantizedStartStepsForPitch(seed, ghostPitch)
  quantizedStartSteps.forEach(quantizedStartStep => {
    pattern[quantizedStartStep].push({ pitch: ghostPitch, sample })
    scheduleSample(quantizedStartStep, sample)
  })
}





/**
 * Clear out all instances of a pitch from a pattern. An optional callback is called if the pitch is found
 * @param pitch {number}
 * @param pattern {[{ pitch: number }][]}
 * @param callBackWithSampleWhenPitchIsFound {(AudioBuffer) => any}
 * @return {*}
 */
const clearPitchFromPattern = (pitch, pattern, callBackWithSampleWhenPitchIsFound = Function.prototype) => {
  const s = pattern.flatMap(step => step.filter(note => note.pitch === pitch)).at(0)

  if (s) {
    callBackWithSampleWhenPitchIsFound(s.sample)
    return pattern
      .map(step => step.filter(drum => !(drum.pitch === pitch)))
  }

  return pattern
}





/**
 * Make a seed from a pattern, introducing a ghost pitch at "boring" intervals to it
 * @param ghostPitch {number}
 * @param pattern {[{ pitch: number, sample: AudioBuffer }][]}
 * @param timesToAddGhostPitch {number}
 * @return {INoteSequence}
 */
const makeSeedWithGhostPitchFromPattern = (ghostPitch, pattern, timesToAddGhostPitch = 2) => {
  const oldNotes = pattern.flatMap(step => step.map(drum => patternEntryToSeedEntry(drum.pitch, step.index)))
  const ghostNotesToAdd = evenlySpacedPartitions(timesToAddGhostPitch).map(t => patternEntryToSeedEntry(ghostPitch, t))
  return seedFromSeedEntries(oldNotes, ghostNotesToAdd)
}





/**
 * Get the Quantized StartSteps for a pitch after continuing a seed, making sure the pitch has been used
 * @param seed {INoteSequence}
 * @param pitch {number}
 * @return {Promise<number[]>}
 */
const getQuantizedStartStepsForPitch = async (seed, pitch) => {
  let newDrumOnsets = []
  let attempts = 0

  while (attempts < maxAttemptsToScheduleNewSample && newDrumOnsets.length === 0) {
    const newPattern = await continuePattern(seed, 1.5 + attempts / 10)
    newDrumOnsets = newPattern.notes
      .filter(notes => notes.pitch === pitch)
      .map(note => note.quantizedStartStep)
    attempts++
  }

  return newDrumOnsets.length === 0
    ? randomlyAssignQuantizedStartSteps(pitch, 4, 1.2)
    : newDrumOnsets
}





/**
 * Randomly set some quantizedStartSteps for a pitch
 * @param pitch {number}
 * @param meanNumberOfTimesToAdd {number}
 * @param stddev {number}
 * @param numberOfSteps {number} defaults to 16
 * @return {number[]}
 */
const randomlyAssignQuantizedStartSteps = (pitch, meanNumberOfTimesToAdd, stddev, numberOfSteps = 16) => {
  const numberOfTimesToAddSample = Math.round(getNormallyDistributedNumber(meanNumberOfTimesToAdd, stddev));
  return [...new Array(numberOfTimesToAddSample)]
    .map(() => Math.floor(Math.random() * numberOfSteps))
}





/**
 * Map a pattern entry to a magenta seed entry
 * @param pitch {number}
 * @param index {number}
 * @returns {{pitch: number, startTime, endTime: number}}
 */
const patternEntryToSeedEntry = (pitch, index) => ({
  pitch,
  startTime: index / 16.0,
  endTime: Math.min(index / 16 + 0.5, 1.0)
})





/**
 * Map seed entries to a magenta seed
 * @param seedEntries {{pitch: number, startTime, endTime: number}[]}
 * @returns {INoteSequence}
 */
const seedFromSeedEntries = (...seedEntries) => ({
  notes: Array.prototype.concat(seedEntries).flat(),
  totalTime: 1.0,
})
