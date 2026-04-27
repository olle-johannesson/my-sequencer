import {continuePattern, quantizeSeed} from "../magentaHelper.js";
import {PITCH_TO_DRUM} from "../drums/drumNameMaps.js";
import {setBpm, setSwing} from "../looper.js";
import {
  aBoomBapSeed,
  aDiscoPopSeed,
  aFunkyDrummerAdjacentSeed,
  aLeveeAdjacentSeed,
  aMotorikSeed,
  anAfrobeatLiteSeed,
  aRosannaAdjacentSeed
} from "../drums/beats/index.js";
import {funkySeedPresets} from "../drums/beats/presets.js";

let scheduledDrums = [...new Array(16)].map(() => new Set())
let currentPattern
let nextPattern
let nextOnsets
let loadedDrumSamples

export {scheduledDrums as drumPattern}

const exampleBeats = [
  anAfrobeatLiteSeed,
  aDiscoPopSeed,
  aBoomBapSeed,
  aFunkyDrummerAdjacentSeed,
  aMotorikSeed,
  aRosannaAdjacentSeed,
  aLeveeAdjacentSeed
]

/**
 *
 * @param pattern {{drum: AudioBuffer, onset: number}[]}
 */
export function setDrumpattern(pattern) {
  for (const slot of scheduledDrums) slot.clear()
  pattern.forEach(({drum, onset}) => scheduleDrum(onset, drum));
}

/**
 * Schedule a new drum to be played
 * @param index {number}
 * @param sample {AudioBuffer}
 */
export function scheduleDrum(index, sample) {
  scheduledDrums[index].add(sample);
}

/**
 * Remove all drums from the playing schedule
 */
export function clearAllDrums() {
  for (const slot of scheduledDrums) slot.clear()
}

// When a kit doesn't have a specific drum, fall back to the closest available one
// so the looper doesn't silently drop the hit. Walk the chain until we land on
// something the kit actually has.
const DRUM_FALLBACK_CHAIN = {
  snare2: ['snare'],
  hihatPedal: ['hihatClosed'],
  hihatOpen: ['hihatClosed'],
  ride: ['hihatClosed'],
  crash: ['hihatOpen', 'hihatClosed'],
  tomMid: ['tomLow', 'tomHigh'],
  tomHigh: ['tomMid', 'tomLow'],
  tomLow: ['tomMid', 'tomHigh'],
}

function resolveDrum(kit, drumName) {
  if (kit[drumName]) return kit[drumName]
  for (const fallback of DRUM_FALLBACK_CHAIN[drumName] ?? []) {
    if (kit[fallback]) return kit[fallback]
  }
  return undefined
}

export async function initDrumPattern(audioContext) {
  let preset = funkySeedPresets[Math.floor(Math.random() * funkySeedPresets.length)]
  loadedDrumSamples = await preset.loadKit(audioContext)
  currentPattern = await quantizeSeed(preset.seed)
  setSwing(preset.swing)
  setBpm(preset.bpm)

  nextPattern = await continuePattern(currentPattern, 1)
  nextOnsets = toSampleOnsets(nextPattern)
  setDrumpattern(nextOnsets)
}

export async function updateDrumPattern() {
  if (nextOnsets) {
    setDrumpattern(nextOnsets)
  }

  currentPattern = nextPattern
  nextPattern = await continuePattern(nextPattern, 1)
  nextOnsets = toSampleOnsets(nextPattern)
}

export function toSampleOnsets(pattern) {
  return pattern.notes
    .map(note => ({drum: PITCH_TO_DRUM[note.pitch], onset: note.quantizedStartStep}))
    .filter(n => n.drum)
    .map(n => ({...n, drum: resolveDrum(loadedDrumSamples, n.drum)}))
    .filter(n => n.drum)
}

export function slightlyModifySeed(seed) {
  const notes = [...seed.notes]
  const selectedNoteIndex = Math.floor(Math.random() * notes.length)
  const choice = Math.random()

  if (choice < 0.33) {
    // drop it
    notes.splice(selectedNoteIndex, 1)
  } else {
    // micro shift
    const shift = (Math.random() * 0.04) - 0.02
    notes[selectedNoteIndex] = {
      ...notes[selectedNoteIndex],
      startTime: Math.max(0, notes[selectedNoteIndex].startTime + shift),
      endTime: Math.max(
        notes[selectedNoteIndex].startTime + 0.01,
        notes[selectedNoteIndex].endTime + shift
      ),
    }
  }

  return {
    ...seed,
    notes,
  }
}