import {thunk} from "./util/thunk.js";
import {getNormallyDistributedNumber} from "./util/random.js";

export let bpm = 120;
let currentStep = 0
let nextStepTime = undefined
let scheduledSamples = [...new Array(16)].map(() => new Set())
const currentlyPlaying = new Map()
const stepsPerBeat = 4;
const stepDuration = 60 / bpm / stepsPerBeat;
const scheduleAheadTime = 0.1;
const baseGain = 0.8;
const velocityByStep = [
  1.0, 0.5, 0.8, 0.5,
  0.8, 0.4, 0.6, 0.5,
  0.9, 0.5, 0.7, 0.5,
  0.8, 0.4, 0.6, 0.5
];

/**
 * Schedule a new sample to be played
 * @param index {number}
 * @param sample {AudioBuffer}
 */
export function scheduleSample(index, sample) {
  scheduledSamples[index].add(sample);
}

/**
 * Clear a sample from the playing schedule
 * @param sample {AudioBuffer}
 */
export function clearSample(sample) {
  scheduledSamples.forEach(slot => slot.delete(sample));
}

/**
 * Remove all samples from the playing schedule
 */
export function clearAllSamples() {
  scheduledSamples = [...new Array(16)].map(() => new Set())
}

export function scheduler(audioContext, outputNode, loop = true) {
  if (nextStepTime === undefined) {
    nextStepTime = audioContext?.currentTime + 0.1;
  }

  while (nextStepTime < audioContext.currentTime + scheduleAheadTime) {
    const stepSamples = scheduledSamples[currentStep] ?? new Set()
    const stepVelocity = velocityByStep[currentStep % velocityByStep.length] ?? 1;

    Array.from(stepSamples)
      .filter(Boolean)
      .map(thunk)
      .filter(f => f instanceof AudioBuffer)
      .forEach(sample => {
        const humanFactor = getNormallyDistributedNumber(0, 0.05);
        const gain = baseGain * stepVelocity + humanFactor;
        playSampleAt(audioContext, sample, nextStepTime, gain, outputNode)
      })

    currentStep = (currentStep + 1) % scheduledSamples.length;
    nextStepTime += stepDuration;
  }
  if (loop) {
    requestAnimationFrame(() => scheduler(audioContext, outputNode));
  }
}

function stopWithFade(audioContext, bufferSource, gainNode, fadeMs = 5) {
  const now = audioContext.currentTime;
  const fade = fadeMs / 1000;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(0.0001, now + fade);

  bufferSource.stop(now + fade + 0.001);
}

function playSampleAt(audioContext, sample, time, gain = 1, outputNode) {
  if (!sample) return;
  if (currentlyPlaying.has(sample)) {
    try {
      const { bufferSource, gainNode } = currentlyPlaying.get(sample)
      stopWithFade(audioContext, bufferSource, gainNode)
    } catch {}
    currentlyPlaying.delete(sample)
  }

  let bufferSource = audioContext.createBufferSource()
  bufferSource.buffer = sample;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = gain;

  bufferSource.connect(gainNode);
  gainNode.connect(outputNode);

  bufferSource.start(time);
  currentlyPlaying.set(sample, { bufferSource, gainNode })
}


