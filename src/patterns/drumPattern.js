import {aConservativeSeed} from "../patternMutation.js";
import {continuePattern} from "../magentaHelper.js";
import {PITCH_TO_DRUM} from "../drums/drumNameMaps.js";

let scheduledDrums =          [...new Array(16)].map(() => new Set())
let nextPattern

export { scheduledDrums as drumPattern }

/**
 *
 * @param pattern {{drum: AudioBuffer, onset: number}[]}
 */
export function setDrumpattern(pattern) {
  scheduledDrums = [...new Array(16)].map(() => new Set())
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
  scheduledDrums = [...new Array(16)].map(() => new Set())
}

export async function updateDrumPattern(loadedDrumSamples) {
  if (!nextPattern) {
    nextPattern = await continuePattern(aConservativeSeed, 0.85)
  }

  let onsets = nextPattern.notes
    .map(note => ({ drum: PITCH_TO_DRUM[note.pitch], onset: note.quantizedStartStep }))
    .filter(n => n.drum)
    .map(n => ({...n, drum: loadedDrumSamples[n.drum]}))

  setDrumpattern(onsets)
  continuePattern(aConservativeSeed, 0.85).then(p => nextPattern = p)
}
