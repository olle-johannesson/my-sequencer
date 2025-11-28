import {thunk} from "./util/thunk.js";
import {getNormallyDistributedNumber} from "./util/random.js";

export let bpm = 120;
export let currentStep = 0
export let nextStepTime = undefined
export let pattern = [...new Array(16)].map(() => new Set())

const stepsPerBeat = 4;
const stepDuration = 60 / bpm / stepsPerBeat;
const scheduleAheadTime = 0.1;

const velocityByStep = [
  1.0, 0.5, 0.8, 0.5,
  0.8, 0.4, 0.6, 0.5,
  0.9, 0.5, 0.7, 0.5,
  0.8, 0.4, 0.6, 0.5
];

const baseGain = 0.8; // overall drum volume

let sampleQueue = []

export function addSample(index, sample) {
  let uniqueSamples = new Set(sampleQueue)
  if (uniqueSamples.has(sample) && uniqueSamples.size > 8) {
    const oldSample = sampleQueue.shift()
    clearSample(oldSample)
  } else {
    sampleQueue.push(sample)
  }
  pattern[index].add(sample);
}

export function addDrumSample(index, sample) {
  pattern[index].add(sample);
}

export function clearSample(sample) {
  pattern.forEach(slot => slot.delete(sample));
}

export function clearAllSamples() {
  pattern = [...new Array(16)].map(() => new Set())
}

export function scheduler(audioContext, outputNode, loop = true) {
  if (nextStepTime === undefined) {
    nextStepTime = audioContext?.currentTime + 0.1;
  }

  const now = audioContext.currentTime;

  while (nextStepTime < now + scheduleAheadTime) {
    const stepSamples = pattern[currentStep] ?? new Set()
    const stepVelocity = velocityByStep[currentStep % velocityByStep.length] ?? 1;

    Array.from(stepSamples)
      .filter(Boolean)
      .map(thunk)
      .filter(f => f instanceof AudioBuffer)
      .map(sample => {
        const humanFactor = getNormallyDistributedNumber(0, 0.05);
        const gain = baseGain * stepVelocity + humanFactor;
        return {sample, gain}
      }
  )
      .forEach(({ sample, gain }) => playSampleAt(audioContext, sample, nextStepTime, gain, outputNode))

    currentStep = (currentStep + 1) % pattern.length;
    nextStepTime += stepDuration;
  }
  if (loop) {
    requestAnimationFrame(() => scheduler(audioContext, outputNode));
  }
}

function playSampleAt(audioContext, sample, time, gain = 1, outputNode) {
  const buffer = sample;
  if (!buffer) return;

  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = gain;

  source.connect(gainNode);
  gainNode.connect(outputNode);

  source.start(time);
}


