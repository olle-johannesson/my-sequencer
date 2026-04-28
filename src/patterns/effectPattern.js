import {addARegion, removeRandomRegion} from "../util/regionsOfAnArray.js";

const scheduledFx = [...new Array(16)].map(() => null);

export { scheduledFx as effectPattern }

/**
 * Pick a small mutation: maybe drop a region, maybe add one. Keeps the pattern sparse so
 * effects punctuate rather than dominate. Caller passes the pool of candidate effect keys
 * (or objects) — typically Object.keys(allPresets).
 * @param candidateEffects {Array<any>}
 */
export function updateEffectPattern(candidateEffects) {
  if (!candidateEffects?.length) return
  const activeSteps = scheduledFx.filter(Boolean).length

  let next
  if (activeSteps === 0) {
    // empty — always add one
    next = addAudibleRegion(scheduledFx, pickRandom(candidateEffects))
  } else if (activeSteps > 8 || Math.random() < 0.45) {
    // crowded or rolling the dice toward subtraction
    next = removeRandomRegion(scheduledFx)
  } else {
    next = addAudibleRegion(scheduledFx, pickRandom(candidateEffects))
  }

  // mutate in place so the looper's captured reference sees the change
  for (let i = 0; i < scheduledFx.length; i++) scheduledFx[i] = next[i]
}

// Like addARandomRegion but with a length floor so the effect actually has time to be heard
// (the util's N(0,3) distribution often produces regions of 1 step, which sounds like
// the effect is glitching off every 16th).
function addAudibleRegion(arr, value) {
  const len = 3 + Math.floor(Math.random() * 5)   // 3..7 steps
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
