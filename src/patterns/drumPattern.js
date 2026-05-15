import {continuePattern, quantizeSeed} from "../magentaHelper.js";
import {DRUM_TO_PITCH, PITCH_TO_DRUM} from "../drums/drumNameMaps.js";
import {setBpm, setSwing} from "../looper.js";
import {creepRevertChance, creepTemperature, resetCreep, tickCreep} from "./creep.js";
import {funkySeedPresets} from "../drums/beats/presets.js";
import {loadSample} from "../drums/loadSample.js";
import {thunk} from "../util/thunk.js";
import {getNormallyDistributedNumber} from "../util/random.js";
import {audioConfig, STEPS_PER_BAR} from "../config.js";

let kit
let scheduledDrums = [...new Array(STEPS_PER_BAR)].map(() => new Set())
let seedPattern        // the freshly quantized seed, kept around so we can snap back to it
let currentPattern
let nextPattern
let nextOnsets
let loadedDrumSamples = {}

export {scheduledDrums as drumPattern}

/**
 * The magenta-quantized note sequence currently driving the drums. Exposed
 * so the bass pattern can seed its own continuation from it (ghosting in
 * extra kicks, then extracting bass onsets from the result). Lifetime-wise
 * it's whatever updateDrumPattern most recently promoted; nullable until
 * initDrumPattern has run.
 */
export function getCurrentPattern() {
  return currentPattern
}

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

/**
 * Curried scheduler for the looper's `scheduleDrums` callback. The caller
 * supplies the `play` function — wire a polyphonic one here so drum hits
 * can stack on the same step (kick + snare + hat).
 */
export const scheduleAt = (audioContext, outputNode, play) => (time, drumSamples, stepGain) => {
  drumSamples
    .map(thunk)
    .filter(f => f instanceof AudioBuffer)
    .forEach(drumSample => {
      const gain = audioConfig.baseGain * stepGain + getNormallyDistributedNumber(0, audioConfig.humanFactor.drums)
      play(audioContext, drumSample, time, gain, outputNode)
    })
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

