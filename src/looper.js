import {thunk} from "./util/thunk.js";
import {getNormallyDistributedNumber} from "./util/random.js";
import {clamp} from "./util/clamp.js";
import {playMonophonicSampleAt, playSampleAt} from "./audio/samplePlayer.js";
import {repeatState} from "./effects/repeat.js";
import {incrementPatternAge} from "./patterns/samplePattern.js";

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

let swingByStep = new Array(16).fill(0)

export function setSwing(perStepFractions) {
  swingByStep = new Array(16).fill(0)
  if (!perStepFractions) return
  for (const [step, fraction] of Object.entries(perStepFractions)) {
    swingByStep[+step] = fraction
  }
}
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

export function setBpm(newBpm) {
  if (typeof newBpm === 'number' && newBpm > 0) {
    bpm = newBpm
  }
}

let lastEffect = null

export function startLoop(audioContext, outputNode, samplePattern, drumPattern, effectPattern, callbacks = {}) {
  isRunning = true
  lastEffect = null
  scheduler(audioContext, outputNode, samplePattern, drumPattern, effectPattern, callbacks)
}

export function stopLoop() {
  isRunning = false
  currentStep = 0
  currentBar = 0
  nextStepTime = undefined
  lastEffect = null
}

function scheduler(audioContext, outputNode, samplePattern, drumPattern, effectPattern, callbacks = {}) {
  if (!isRunning) {
    return
  }

  if (nextStepTime === undefined) {
    nextStepTime = audioContext?.currentTime + 0.25;
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

    const swingDelay = swingByStep[currentStep % swingByStep.length] * calculateStepDuration()
    const stepPlayTime = nextStepTime + swingDelay

    const currentEffect = effectPattern?.[currentStep] ?? null
    if (currentEffect !== lastEffect && typeof callbacks.onEffectChange === 'function') {
      callbacks.onEffectChange(currentEffect, lastEffect, stepPlayTime)
    }
    lastEffect = currentEffect

    ;[...samplesToPlay, ...drumsToPlay].forEach(job => job(stepPlayTime))

    if (repeatState.active) {
      const repeatInterval = calculateStepDuration() / repeatState.subdivision;
      let repeatTime = stepPlayTime + repeatInterval;

      while (repeatTime < stepPlayTime + calculateStepDuration()) {
        ;[...samplesToPlay, ...drumsToPlay].forEach(job => job(repeatTime))
        repeatTime += repeatInterval;
      }
    }

    currentStep = (currentStep + 1) % samplePattern.length;
    if (currentStep === 0) {
      currentBar++
      incrementPatternAge()
    }

    if (typeof callbacks.beforeNextStep === 'function') {
      callbacks.beforeNextStep(currentStep, currentBar)
    }

    nextStepTime += calculateStepDuration();
  }

  setTimeout(() => scheduler(audioContext, outputNode, samplePattern, drumPattern, effectPattern, callbacks), 10);
}

