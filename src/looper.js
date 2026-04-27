import {thunk} from "./util/thunk.js";
import {getNormallyDistributedNumber} from "./util/random.js";
import {clamp} from "./util/clamp.js";
import {playMonophonicSampleAt, playSampleAt} from "./audio/samplePlayer.js";
import {repeatState} from "./effects/repeat.js";

export let bpm = 96;
let isRunning = false
let currentStep = 0
let currentBar = 0
let nextStepTime = undefined

const stepsPerBeat = 4;
const calculateStepDuration = () => 60 / bpm / stepsPerBeat;
const scheduleAheadTime = 0.1;
const baseGain = 0.8;
const velocityByStep = [
  1.0, 0.5, 0.8, 0.5,
  0.8, 0.4, 0.6, 0.5,
  0.9, 0.5, 0.7, 0.5,
  0.8, 0.4, 0.6, 0.5
];
const commonBpmSettings = [
  72, 88, 96, 112, 120,
  132, 144
]

export function rndBpm() {
  const maxIndex = commonBpmSettings.length - 1
  const rndIndex = Math.round(getNormallyDistributedNumber(maxIndex / 2, 2))
  const clamped = clamp(rndIndex, 0, maxIndex)
  bpm = commonBpmSettings[clamped]
}

export function startLoop(audioContext, outputNode, samplePattern, drumPattern, callbacks = {}) {
  isRunning = true
  scheduler(audioContext, outputNode, samplePattern, drumPattern, callbacks)
}

export function stopLoop() {
  isRunning = false
  currentStep = 0
  currentBar = 0
  nextStepTime = undefined
}

function scheduler(audioContext, outputNode, samplePattern, drumPattern, callbacks = {}) {
  if (!isRunning) {
    return
  }

  if (nextStepTime === undefined) {
    nextStepTime = audioContext?.currentTime + 0.1;
  }

  while (nextStepTime < audioContext.currentTime + scheduleAheadTime) {
    if (currentStep === samplePattern.length - 1 && typeof callbacks.beforeEachCycle === 'function') {
      callbacks.beforeEachCycle(currentBar)
    }

    const stepSamples = samplePattern[currentStep] ?? new Set()
    const drumSamples = drumPattern[currentStep] ?? new Set()
    const stepVelocity = velocityByStep[currentStep % velocityByStep.length] ?? 1;

    const samplesToPlay = Array.from(stepSamples)
      .map(thunk)
      .filter(f => f instanceof AudioBuffer)
      .map(sample => {
        const humanFactor = getNormallyDistributedNumber(0, 0.05);
        const gain = baseGain * stepVelocity + humanFactor;
        return t => playMonophonicSampleAt(audioContext, sample, t, gain, outputNode)
      })

    const drumsToPlay = Array.from(drumSamples)
      .map(thunk)
      .filter(f => f instanceof AudioBuffer)
      .map(sample => {
        const humanFactor = getNormallyDistributedNumber(0, 0.025);
        const gain = baseGain * stepVelocity + humanFactor;
        return t => playSampleAt(audioContext, sample, t, gain, outputNode)
      })

    ;[...samplesToPlay, ...drumsToPlay].forEach(job => job(nextStepTime))

    if (repeatState.active) {
      const repeatInterval = calculateStepDuration() / repeatState.subdivision;
      let repeatTime = nextStepTime + repeatInterval;

      while (repeatTime < nextStepTime + calculateStepDuration()) {
        ;[...samplesToPlay, ...drumsToPlay].forEach(job => job(repeatTime))
        repeatTime += repeatInterval;
      }
    }

    currentStep = (currentStep + 1) % samplePattern.length;
    if (currentStep === 0) {
      currentBar++
    }

    if (typeof callbacks.beforeNextStep === 'function') {
      callbacks.beforeNextStep(currentStep, currentBar)
    }

    nextStepTime += calculateStepDuration();
  }

  requestAnimationFrame(() => scheduler(audioContext, outputNode, samplePattern, drumPattern, callbacks));
}

