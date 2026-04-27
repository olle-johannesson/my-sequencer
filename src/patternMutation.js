import {continuePattern} from "./magentaHelper.js";
import {getNormallyDistributedNumber} from "./util/random.js";
import {evenlySpacedPartitions} from "./util/evenlySpacedPartitions.js";
import {DRUM_TO_PITCH} from "./drums/drumNameMaps.js";
import {clearSample} from "./patterns/samplePattern.js";

const maxAttemptsToScheduleNewSample = 5
const maxSamples = 5
const maxEffects = 3
let nextSample = 0
let nextEffect = 0

// DrumsRNN-friendly “filler” pitches
const goodFillerPitches = [
  45, // Low Tom
  48, // Mid Tom
  50, // High Tom
  42, // Closed Hat (nice as a “clicky” filler)
  46, // Open Hat
  49, // Crash
  51, // Ride
];

const pitchesNotCollidingWithTheFillerPitches = [
  72, 73, 74, 75,
  76, 77, 78, 79,
  80, 81, 82, 83,
  84, 85, 86, 87,
  88, 89, 90, 91,
];

/**
 * @type {*[{ pitch: number, sample: AudioBuffer }][]}
 */
let samplePattern = [
  [],[],[],[],
  [],[],[],[],
  [],[],[],[],
  [],[],[],[]
]

let effectPattern = [
  0, 0, 0, 0,
  0, 0, 0, 0,
  0, 0, 0, 0,
  0, 0, 0, 0,
]

export const aConservativeSeed = {
  // boom chack boom-boom chack
  notes: [
    { pitch: DRUM_TO_PITCH.kick, startTime: 0,   endTime: 0.25 },
    { pitch: DRUM_TO_PITCH.snare, startTime: 0.25, endTime: 0.5 },
    { pitch: DRUM_TO_PITCH.kick, startTime: 0.5, endTime: 0.75 },
    { pitch: DRUM_TO_PITCH.kick, startTime: 0.625, endTime: 0.75 },
    { pitch: DRUM_TO_PITCH.snare, startTime: 0.75, endTime: 1.0 },
  ],
  totalTime: 1.0,
}





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
  const ghostPitch = goodFillerPitches[index]

  samplePattern = clearPitchFromPattern(ghostPitch, samplePattern, clearSample)
  const seed = makeSeedWithGhostPitchFromPattern(ghostPitch, samplePattern, 2);
  const quantizedStartSteps = await getQuantizedStartStepsForPitch(seed, ghostPitch)
  quantizedStartSteps.forEach(quantizedStartStep => {
    samplePattern[quantizedStartStep].push({ pitch: ghostPitch, sample })
    scheduleSample(quantizedStartStep, sample)
  })
}

export function rescheduleOneOfTheRecordedSamples(scheduleSample, clearSample) {
  const samples = samplePattern.flatMap(step => step.map(d => d.sample))
  let randomSample = samples[Math.floor(Math.random() * samples.length)]
  clearSample(randomSample)
  addNewRecordedSample(randomSample, scheduleSample, clearSample)
}

export async function continueEffectPattern(scheduleEffect, clearAllEffects) {
  const ghostPitchIndex = ++nextEffect % pitchesNotCollidingWithTheFillerPitches.length
  const ghostPitch = pitchesNotCollidingWithTheFillerPitches[ghostPitchIndex]

  const oldNotes = effectPattern.map((pitch, i) => pitch ? patternEntryToSeedEntry(pitch) : null).filter(Boolean)
  const ghostNotesToAdd = evenlySpacedPartitions(2).map(t => patternEntryToSeedEntry(ghostPitch, t))
  const seed = seedFromSeedEntries(oldNotes, ghostNotesToAdd)
  const quantizedStartSteps = await getQuantizedStartStepsForPitch(seed, ghostPitch, 0.003)
  effectPattern = effectPattern.map((pitch, index) => {
    if (quantizedStartSteps.includes(index)) {
      return ghostPitch
    } else if (pitch + maxEffects < ghostPitch) {
      return 0
    } else {
      return pitch
    }
  })

  clearAllEffects()
  effectPattern.forEach((pitch, index) => {
    if (pitch >= pitchesNotCollidingWithTheFillerPitches[0]) {
      scheduleEffect(index, pitch - pitchesNotCollidingWithTheFillerPitches[0])
    }
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
const getQuantizedStartStepsForPitch = async (seed, pitch, temperature = 1.5) => {
  let newDrumOnsets = []
  let attempts = 0

  while (attempts < maxAttemptsToScheduleNewSample && newDrumOnsets.length === 0) {
    const newPattern = await continuePattern(seed, temperature + attempts / 10)
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
