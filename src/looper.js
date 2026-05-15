import {thunk} from "./util/thunk.js";
import {getNormallyDistributedNumber} from "./util/random.js";
import {playMonophonicSampleAt, playSampleAt} from "./audio/samplePlayer.js";
import {repeatState} from "./effects/repeat.js";
import {incrementPatternAge} from "./patterns/samplePattern.js";
import {nextModulation} from "./patterns/modulation.js";
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

export function startLoop(audioContext, outputNode, samplePattern, drumPattern, bassPattern, effectPattern, callbacks = {}) {
  isRunning = true
  lastEffect = null
  scheduler(audioContext, outputNode, samplePattern, drumPattern, bassPattern, effectPattern, callbacks)
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
function scheduler(audioContext, outputNode, samplePattern, drumPattern, bassPattern, effectPattern, callbacks = {}) {

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
    // If the beforeEachCycle callback is defined, we call it now (if we are
    // at the beginning of a new cycle (musical bar), that is).
    if ((currentStep + 1) % STEPS_PER_BAR === 0 && typeof callbacks.beforeEachCycle === 'function') {
      callbacks.beforeEachCycle(currentBar)
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

    // We map the samples to functions that will schedule them at time t. This gives us an opportunity
    // to call thunks, weed out potential null returns or other cruft, and further refine the volume
    // with a bit of random "human factor".
    const samplesToPlay = Array.from(stepSamples)
      .map(thunk)
      .filter(f => f instanceof AudioBuffer)
      .map(sample => {
        const humanFactor = getNormallyDistributedNumber(0, 0.05);
        const gain = audioConfig.baseGain * stepVelocity + humanFactor;
        // Pitched samples walk their pentatonic table here; non-pitched
        // samples return undefined and play at natural rate. Captured
        // into the closure so any stutter-repeats below share the pick.
        const modulation = nextModulation(sample)
        return t => playMonophonicSampleAt(audioContext, sample, t, gain, outputNode, modulation)
      })

    // Now the same for the drum samples. It's pretty much the same, but with a bit more
    // moderate "human factor". These are drum machine samples, after all.
    const drumsToPlay = Array.from(drumSamples)
      .map(thunk)
      .filter(f => f instanceof AudioBuffer)
      .map(sample => {
        const humanFactor = getNormallyDistributedNumber(0, 0.025);
        const gain = audioConfig.baseGain * stepVelocity + humanFactor;
        return t => playSampleAt(audioContext, sample, t, gain, outputNode)
      })

    // Bass: zero or one entry per step. Pitch (playbackRate) is baked into
    // the pattern at regen time, not picked at playback. Monophonic — bass
    // notes interrupt the previous one when they overlap.
    const bassToPlay = bassEntry && bassEntry.buffer instanceof AudioBuffer
      ? [(() => {
          const humanFactor = getNormallyDistributedNumber(0, 0.025);
          const gain = audioConfig.baseGain * stepVelocity + humanFactor;
          const {buffer, playbackRate} = bassEntry
          return t => playMonophonicSampleAt(audioContext, buffer, t, gain, outputNode, {playbackRate})
        })()]
      : []

    // Before we schedule the samples we can bastardise the timing of the next step a little bit.
    // Like introducing swing. This is a bit crude way to do it (could have used trigonometry or
    // something), but it does the trick. A simple fraction of the bpm is added to the time of
    // the next step.
    const swingDelay = swingFactor * calculateStepDuration()
    const stepPlayTime = nextStepTime + swingDelay

    // Now that we have the time for the next batch of samples calculated out, we can go
    // ahead and schedule all of them.
    ;[...samplesToPlay, ...drumsToPlay, ...bassToPlay].forEach(job => job(stepPlayTime))

    // If we are to change effect, we can do that now. This is handled in a callback,
    // so we simply call that, taking no responsibility in this function for whatever
    // is going to happen.
    if (currentEffect !== lastEffect && typeof callbacks.onEffectChange === 'function') {
      callbacks.onEffectChange(currentEffect, lastEffect, stepPlayTime)
    }
    lastEffect = currentEffect

    // A special effect, however, is the stuttering effect. Since this is a matter of re-triggering
    // the samples, we do it here. It is no magic trick, just work out the timing as a fraction of
    // the duration of a 16th and schedule a bunch of samples. We just have to mind that we don't
    // schedule them so for into the future that we interfere with the next 16th.
    if (repeatState.active) {
      const repeatInterval = calculateStepDuration() / repeatState.subdivision;
      let repeatTime = stepPlayTime + repeatInterval;

      while (repeatTime < stepPlayTime + calculateStepDuration()) {
        ;[...samplesToPlay, ...drumsToPlay, ...bassToPlay].forEach(job => job(repeatTime))
        repeatTime += repeatInterval;
      }
    }

    currentStep = (currentStep + 1) % STEPS_PER_BAR;
    if (currentStep === 0) {
      currentBar++
      incrementPatternAge()
    }

    if (typeof callbacks.beforeNextStep === 'function') {
      callbacks.beforeNextStep(currentStep, currentBar)
    }

    nextStepTime += calculateStepDuration();
  }

  setTimeout(() => scheduler(audioContext, outputNode, samplePattern, drumPattern, bassPattern, effectPattern, callbacks), 10);
}

