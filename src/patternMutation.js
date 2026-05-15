import {continuePattern} from "./magentaHelper.js";
import {getNormallyDistributedNumber} from "./util/random.js";
import {evenlySpacedPartitions} from "./util/evenlySpacedPartitions.js";
import {GHOST_PITCHES_BY_CLASS, MAGENTA_DRUM_CLASSES} from "./drums/drumNameMaps.js";
import {buildModulationTable, setModulation} from "./patterns/modulation.js";
import {clearSample, samplePatternAge, scheduleSample} from "./patterns/samplePattern.js";

// Pitch-stability score above which a recorded sample is treated as a
// sustained pitched source — gets equipped with a pentatonic modulation
// table that the looper walks across the bar. 0.6 is the initial guess;
// re-tune against real recordings.
const PITCHED_STABILITY_THRESHOLD = 0.1

// Each retry is an awaited magenta round-trip inside `beforeEachCycle`. The
// looper's catch-up snap masks the audible damage, but a high cap can drop
// whole bars on slower hardware. 2 attempts is enough that the random
// fallback rarely triggers in practice.
const maxAttemptsToScheduleNewSample = 2

/**
 * Local mirror of the looper's sample-pattern, but with pitch info attached
 * (the looper's array is just AudioBuffers in Sets — no pitch). We keep this
 * around so we can build magenta seeds that include the recorded samples
 * under their assigned ghost pitch — that's how each new recording slots
 * into the pattern in a magenta-friendly way.
 *
 * Cleared by clearMutationState() on stop, so recordings don't leak across
 * sessions.
 *
 * @type {*[{ pitch: number, sample: AudioBuffer }][]}
 */
let samplePattern = [
  [], [], [], [],
  [], [], [], [],
  [], [], [], [],
  [], [], [], []
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
 * @param classification {string}
 * @param features {object=}
 */
export async function addNewRecordedSample(sample, classification = MAGENTA_DRUM_CLASSES.percussive, features) {
  // Equip stable-pitched samples with a modulation table before they hit
  // the looper. WeakMap-keyed by buffer, so every scheduled occurrence of
  // this sample walks the same melodic cursor.
  if (features?.sustained > 0.5 && features?.pitchStability > PITCHED_STABILITY_THRESHOLD) {
    setModulation(sample, buildModulationTable(sample))
  }

  const suitableGhostPitches = GHOST_PITCHES_BY_CLASS[classification]
  const ghostPitch = suitableGhostPitches[Math.floor(Math.random() * suitableGhostPitches.length)]

  samplePattern = clearPitchFromPattern(ghostPitch, samplePattern, clearSample)
  const seed = makeSeedWithGhostPitchFromPattern(ghostPitch, samplePattern, 2);
  const quantizedStartSteps = await getQuantizedStartStepsForPitch(seed, ghostPitch)
  quantizedStartSteps.forEach(quantizedStartStep => {
    samplePattern[quantizedStartStep].push({pitch: ghostPitch, sample})
    scheduleSample(quantizedStartStep, sample)
  })
}

export function rescheduleOneOfTheRecordedSamples() {
  const samples = samplePattern.flatMap(step => step.map(d => d.sample))
  let randomSample = samples[Math.floor(Math.random() * samples.length)]
  clearSample(randomSample)
  addNewRecordedSample(randomSample)
}

/**
 * Bar-tick gate around `rescheduleOneOfTheRecordedSamples`. If the looper
 * has been chewing on the same sample pattern for more than a bar without
 * anything fresh being added, stir things up — pluck one of the existing
 * recordings and re-place it via magenta.
 *
 * Owned here rather than in main.js because the "have we gone stale?"
 * question reads from `samplePatternAge`, and the "what do we do about it"
 * lives in this module.
 */
export function maybeReshuffle() {
  if (samplePatternAge > 1) {
    rescheduleOneOfTheRecordedSamples()
  }
}

/**
 * Reset the magenta-seed mirror. Called from stop() — without it, recorded
 * samples from a previous session persist here and get re-injected into the
 * next session via rescheduleOneOfTheRecordedSamples.
 */
export function clearMutationState() {
  samplePattern = [
    [], [], [], [],
    [], [], [], [],
    [], [], [], [],
    [], [], [], []
  ]
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
  const oldNotes = pattern.flatMap((step, stepIndex) => step.map(drum => patternEntryToSeedEntry(drum.pitch, stepIndex)))
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
