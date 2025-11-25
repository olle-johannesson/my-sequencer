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

export function addSample(index, sample) {
  pattern[index].add(sample);
}

export function clearSample(sample) {
  pattern.forEach(slot => slot.remove(sample));
}

export function scheduler(audioContext) {
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
      .forEach(({ sample, gain }) => playSampleAt(audioContext, sample, nextStepTime, gain))

    currentStep = (currentStep + 1) % pattern.length;
    nextStepTime += stepDuration;
  }

  requestAnimationFrame(() => scheduler(audioContext));
}

function playSampleAt(audioContext, sample, time, gain = 1) {
  const buffer = sample;
  if (!buffer) return;

  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = gain;

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);

  source.start(time);
}


