let scheduledFx = [...new Array(16)].map(() => null);

export { scheduledFx as effectPattern }

/**
 * Schedule a new effect to be played
 * @param startIndex {number}
 * @param endIndex {number}
 * @param effect {object}
 */
export function scheduleSample(startIndex, endIndex, effect) {
  for(let i = startIndex; (i % scheduledFx) <= endIndex; i++ ) {
    scheduledFx[i] = effect
  }
}

/**
 * Clear an effect from the playing schedule
 * @param effect {object}
 */
export function clearEffect(effect) {
  scheduledFx = scheduledFx.map(scheduledEffect => scheduledEffect === effect ? null : scheduledEffect)
}

/**
 * Remove all effects from the playing schedule
 */
export function clearAllEffects() {
  scheduledFx = [...new Array(16)].map(() => null);
}
