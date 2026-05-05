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
// One musical bar is always 16 steps (4 beats × 4 sixteenths). Drum patterns
// can span multiple bars (e.g. a 2-bar preset = 32-slot drumPattern); the
// sample/effect patterns stay 16 and re-loop every musical bar. `currentStep`
// counts within the longest pattern (drum) and wraps when that one wraps;
// musical-bar-tick logic uses `% STEPS_PER_BAR`.
const STEPS_PER_BAR = 16;
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
    // Fire beforeEachCycle on the *musical-bar* boundary (every 16 steps),
    // not on the drum-pattern wrap, so creep / sample-rescheduling cadence
    // is preserved across 1-bar and multi-bar presets.
    if ((currentStep + 1) % STEPS_PER_BAR === 0 && typeof callbacks.beforeEachCycle === 'function') {
      callbacks.beforeEachCycle(currentBar)
    }

    const stepSamples = samplePattern[currentStep % samplePattern.length] ?? new Set()
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

    const currentEffect = effectPattern?.[currentStep % effectPattern.length] ?? null
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

    // Wrap on the longest pattern (drumPattern), so multi-bar presets play
    // through fully before restarting. currentBar / patternAge tick on the
    // musical-bar cadence (every 16 steps) regardless of drum length.
    currentStep = (currentStep + 1) % drumPattern.length;
    if (currentStep % STEPS_PER_BAR === 0) {
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

