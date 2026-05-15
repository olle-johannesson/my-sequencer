import {repeatState} from "./effects/repeat.js";
import {audioConfig} from "./config.js";

export let bpm = 96;
let isRunning = false
let currentStep = 0
let currentBar = 0
let nextStepTime = undefined
let lastEffect = null
let swingByStep = new Array(16).fill(0)

const stepsPerBeat = 4;
const STEPS_PER_BAR = 16;
const calculateStepDuration = () => 60 / bpm / stepsPerBeat;
const velocityByStep = [
  1.0, 0.5, 0.8, 0.5,
  0.8, 0.4, 0.6, 0.5,
  0.9, 0.5, 0.7, 0.5,
  0.8, 0.4, 0.6, 0.5
];


export function setSwing(perStepFractions) {
  swingByStep = new Array(16).fill(0)
  if (!perStepFractions) return
  for (const [step, fraction] of Object.entries(perStepFractions)) {
    swingByStep[+step] = fraction
  }
}

export function setBpm(newBpm) {
  if (typeof newBpm === 'number' && newBpm > 0) {
    bpm = newBpm
  }
}

export function startLoop(audioContext, samplePattern, drumPattern, bassPattern, effectPattern, callbacks = {}) {
  isRunning = true
  lastEffect = null
  scheduler(audioContext, samplePattern, drumPattern, bassPattern, effectPattern, callbacks)
}

export function stopLoop() {
  isRunning = false
  currentStep = 0
  currentBar = 0
  nextStepTime = undefined
  lastEffect = null
}

// This is the looper. The heart of the beast. The idea is thus:
// Adapted from Chris Wilson
// https://ircam-ismm.github.io/webaudio-tutorials/scheduling/timing-and-scheduling.html
// At any call, the function checks the time, and the time at which the next beat should be (using currentTime and bpm).
// If we're outside of a lag-securing offset time, we just return. Very cheap.
// If we're inside of that offset, we schedule samples.
// At the end, we consider if we want to go on playing, and if yes, recursively call the function through
// some mechanism, like requestAnimationFrame, so as not to block the main thread.
// In this case, I use setTimeout instead, since that will keep running also when the page is out of focus,
// such as if the tab is switched in the browser. It also allows us to run the recursion a bit more sparsely,
// offloading the setTimeout lag potential to the offset scheduling time instead.
function scheduler(audioContext, samplePattern, drumPattern, bassPattern, effectPattern, callbacks = {}) {

  // Safety latch to prevent doing things after clicking 'stop'
  if (!isRunning) {
    return
  }

  // If, like the first time called, nextStepTime is not set, we just put something a wee while in the future
  if (nextStepTime === undefined) {
    nextStepTime = audioContext?.currentTime + 0.25;
  }

  // Background tabs throttle setTimeout heavily. When the tab wakes up,
  // currentTime has jumped forward by potentially seconds while nextStepTime
  // sat where we left it. A naive catch-up would walk through every missed
  // step (and run beforeEachCycle / onEffectChange for each crossed bar
  // boundary, queuing many magenta inferences in a row). If we're more than
  // maxCatchupSteps behind, snap to "now" and let the loop resync from
  // a fresh bar instead.
  const stepDuration = calculateStepDuration()
  if (nextStepTime < audioContext.currentTime - audioConfig.maxCatchupSteps * stepDuration) {
    nextStepTime = audioContext.currentTime + 0.05
    currentStep = 0
    currentBar = 0
  }

  while (nextStepTime < audioContext.currentTime + audioConfig.scheduleAheadTime) {
    // Bar start. Fires before step 0 of every bar, including bar 0 — gives
    // callers a clean place to prime pattern state before the new bar's
    // first sample is even scheduled.
    if (currentStep === 0) {
      callbacks?.beforeEachCycle?.(currentBar)
    }

    // Now we can get to work scheduling samples!
    // First, we look into the sample patterns we have established to see what samples should be
    // scheduled for this 16th, as well as which effect we have scheduled.
    const stepSamples = samplePattern[currentStep] ?? new Set()
    const drumSamples = drumPattern[currentStep] ?? new Set()
    const bassEntry   = bassPattern?.[currentStep] ?? null
    const currentEffect = effectPattern?.[currentStep] ?? null

    // The base volume and swing factor for this 16th can be established at this point
    const stepVelocity = velocityByStep[currentStep];
    const swingFactor = swingByStep[currentStep]

    // Before we schedule the samples we can bastardise the timing of the next step a little bit.
    // Like introducing swing. This is a bit crude way to do it (could have used trigonometry or
    // something), but it does the trick. A simple fraction of the bpm is added to the time of
    // the next step.
    const swingDelay = swingFactor * calculateStepDuration()
    const stepPlayTime = nextStepTime + swingDelay

    // The stutter effect is a matter of re-triggering the step's samples at
    // a sub-step interval. Compute the times in one place — the original
    // beat time plus a few fractional follow-ups — so the schedule loop
    // below doesn't need to know about repeats. Times are bounded so they
    // don't interfere with the next 16th.
    const playTimes = [stepPlayTime]
    if (repeatState.active) {
      const repeatInterval = calculateStepDuration() / repeatState.subdivision
      const stepEnd = stepPlayTime + calculateStepDuration()
      for (let t = stepPlayTime + repeatInterval; t < stepEnd; t += repeatInterval) {
        playTimes.push(t)
      }
    }

    // Fire the schedule callbacks once per play time — the looper hands
    // off the *what* (samples, drums, bass) and the *when* (each play
    // time); the callbacks own the *how*.
    const stepSamplesArr = Array.from(stepSamples)
    const drumSamplesArr = Array.from(drumSamples)
    for (const time of playTimes) {
      callbacks?.scheduleSamples?.(time, stepSamplesArr, stepVelocity)
      callbacks?.scheduleDrums?.(time, drumSamplesArr, stepVelocity)
      if (bassEntry && bassEntry.buffer instanceof AudioBuffer) {
        callbacks?.scheduleBass?.(time, bassEntry, stepVelocity)
      }
    }

    // If we are to change effect, we can do that now. This is handled in a callback,
    // so we simply call that, taking no responsibility in this function for whatever
    // is going to happen.
    if (currentEffect !== lastEffect && typeof callbacks.onEffectChange === 'function') {
      callbacks.onEffectChange(currentEffect, lastEffect, stepPlayTime)
    }
    lastEffect = currentEffect

    currentStep = (currentStep + 1) % STEPS_PER_BAR;
    if (currentStep === 0) {
      // Bar end. afterEachCycle fires with the bar number that just ended,
      // before currentBar is incremented — so end-of-bar bookkeeping
      // (sample-pattern aging, telemetry, etc.) sees the bar it pertains to.
      callbacks?.afterEachCycle?.(currentBar)
      currentBar++
    }

    if (typeof callbacks.beforeNextStep === 'function') {
      callbacks.beforeNextStep(currentStep, currentBar)
    }

    nextStepTime += calculateStepDuration();
  }

  setTimeout(() => scheduler(audioContext, samplePattern, drumPattern, bassPattern, effectPattern, callbacks), 10);
}

