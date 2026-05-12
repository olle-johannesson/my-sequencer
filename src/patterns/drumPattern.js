import {continuePattern, quantizeSeed} from "../magentaHelper.js";
import {DRUM_TO_PITCH, PITCH_TO_DRUM} from "../drums/drumNameMaps.js";
import {setBpm, setSwing} from "../looper.js";
import {creepRevertChance, creepTemperature, resetCreep, tickCreep} from "./creep.js";
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
import {loadSample} from "../drums/loadSample.js";

let kit
let scheduledDrums = [...new Array(16)].map(() => new Set())
let seedPattern        // the freshly quantized seed, kept around so we can snap back to it
let currentPattern
let nextPattern
let nextOnsets
let loadedDrumSamples = {}

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

async function resolveDrum(audioContext, kit, drumPitch) {
  const drumName = PITCH_TO_DRUM[drumPitch]
  if (!drumName) return undefined

  if (kit.drums[drumName]) {
    if (loadedDrumSamples[drumPitch]) return loadedDrumSamples[drumPitch]
    const mod = await kit.drums[drumName]()
    const url = mod.default ?? mod
    const sample = await loadSample(audioContext, url)
    loadedDrumSamples[drumPitch] = sample
    return sample
  }

  for (const fallback of DRUM_FALLBACK_CHAIN[drumName] ?? []) {
    if (kit.drums[fallback]) {
      return resolveDrum(audioContext, kit, DRUM_TO_PITCH[fallback])
    }
  }
  return undefined
}

export async function initDrumPattern(audioContext) {
  const preset = funkySeedPresets[Math.floor(Math.random() * funkySeedPresets.length)]
  // console.log('selected beat', preset.name)

  // Reset the per-slot sample cache when we (re)bind to a kit — otherwise a
  // previously-loaded sample under a slot would shadow this kit's version.
  if (kit !== preset.kit) {
    loadedDrumSamples = {}
    kit = preset.kit
  }
  resetCreep()

  seedPattern = await quantizeSeed(preset.seed)
  currentPattern = seedPattern

  setSwing(preset.swing)
  setBpm(preset.bpm)

  nextPattern = await continuePattern(currentPattern, creepTemperature())
  // nextPattern = seedPattern // await continuePattern(currentPattern, 0)
  nextOnsets = await toSampleOnsets(audioContext, kit, nextPattern)
  setDrumpattern(nextOnsets)
}

export async function updateDrumPattern(audioContext) {
  if (nextOnsets) {
    setDrumpattern(nextOnsets)
  }

  tickCreep()
  currentPattern = nextPattern

  if (Math.random() < creepRevertChance()) {
    // exhale: snap back to the seed and start fresh
    console.log('creep revert')
    nextPattern = seedPattern
    resetCreep()
  } else {
    nextPattern = await continuePattern(nextPattern, creepTemperature())
  }

  nextOnsets = await toSampleOnsets(audioContext, kit, nextPattern)
}

export async function toSampleOnsets(audioContext, kit, pattern) {
  const pitchesAndOnsets = pattern.notes
    .map(note => ({ pitch: note.pitch, onset: note.quantizedStartStep }))
    .filter(n => PITCH_TO_DRUM.hasOwnProperty(n.pitch))
  return (await Promise.all(pitchesAndOnsets.map(n => resolveDrum(audioContext, kit, n.pitch))))
    .map((sample, index) => ({ drum: sample, onset: pitchesAndOnsets[index].onset }))
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