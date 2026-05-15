import {addARegion, removeRandomRegion} from "../util/regionsOfAnArray.js";
import {allPresets} from "../effects/effectSwitch.js";
import {getFilterAmount} from "../ui/sliders.js";

const scheduledFx = [...new Array(16)].map(() => null);

export { scheduledFx as effectPattern }

/**
 * Pick a small mutation: maybe drop a region, maybe add one. Caller passes the
 * pool of candidate effect keys plus an `intensity` (0..1) — typically the
 * current creepIntensity(). At intensity 0 the pattern stays sparse with
 * balanced add/remove and short regions; at intensity 1 effects accumulate
 * (mostly add) and regions are longer/more sustained.
 * @param candidateEffects {Array<any>}
 * @param {number} [intensity] 0..1; defaults to 0 (calm)
 */
export function updateEffectPattern(candidateEffects, intensity = 0) {
  if (!candidateEffects?.length) return
  const activeSteps = scheduledFx.filter(Boolean).length

  // remove probability: 0.5 at calm → ~0.1 at wild (effects start stacking up)
  const removeChance = 0.5 - 0.4 * intensity
  // hard ceiling — even at wild, force a cleanup if the pattern is mostly full
  const crowdedAt = 12

  let next
  if (activeSteps === 0) {
    next = addAudibleRegion(scheduledFx, pickRandom(candidateEffects), intensity)
  } else if (activeSteps > crowdedAt || Math.random() < removeChance) {
    next = removeRandomRegion(scheduledFx)
  } else {
    next = addAudibleRegion(scheduledFx, pickRandom(candidateEffects), intensity)
  }

  // mutate in place so the looper's captured reference sees the change
  for (let i = 0; i < scheduledFx.length; i++) scheduledFx[i] = next[i]
}

// Like addARandomRegion but with a length floor so the effect has time to be
// heard (the util's N(0,3) distribution often produces regions of 1 step which
// sounds like glitching). Length scales with intensity: 3-7 at calm, 5-12 at wild.
function addAudibleRegion(arr, value, intensity = 0) {
  const minLen = 3 + Math.floor(intensity * 2)        // 3..5
  const maxLen = 7 + Math.floor(intensity * 5)        // 7..12
  const len = minLen + Math.floor(Math.random() * (maxLen - minLen + 1))
  const start = Math.floor(Math.random() * arr.length)
  const end = (start + len - 1) % arr.length
  return addARegion(arr, start, end, value)
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Schedule an effect across a contiguous (wrap-around) region of steps.
 * @param startIndex {number}
 * @param endIndex {number} inclusive
 * @param effect
 */
export function scheduleEffect(startIndex, endIndex, effect) {
  const len = scheduledFx.length
  let i = ((startIndex % len) + len) % len
  const e = ((endIndex % len) + len) % len
  do { scheduledFx[i] = effect } while ((i = (i + 1) % len) !== (e + 1) % len)
}

/**
 * Clear a specific effect everywhere it appears.
 */
export function clearEffect(effect) {
  for (let i = 0; i < scheduledFx.length; i++) {
    if (scheduledFx[i] === effect) scheduledFx[i] = null
  }
}

/**
 * Remove all effects from the playing schedule.
 */
export function clearAllEffects() {
  for (let i = 0; i < scheduledFx.length; i++) scheduledFx[i] = null
}

/**
 * Per-bar gate around `updateEffectPattern`. Reads the filter slider —
 * the user-facing "intensity knob for effect mutation" — and decides on
 * each bar whether to fire a mutation, with its chance and intensity both
 * scaling off that one value.
 *
 * Owned here rather than in main.js because both the *should it fire*
 * gate and the *what does it do* mutation belong with the effect pattern.
 */
export function maybeMutateOnBar() {
  const filterAmount = getFilterAmount()
  const chance = filterAmount / 3
  if (Math.random() >= chance) return
  const intensity = Math.min(1, filterAmount / 2)
  updateEffectPattern(Object.keys(allPresets), intensity)
}
