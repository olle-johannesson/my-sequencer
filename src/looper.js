export let bpm = 120;
export let currentStep = 0
export let nextStepTime = undefined
export let pattern = [...new Array(16)].map(() => new Set())

const stepsPerBeat = 4;
const stepDuration = 60 / bpm / stepsPerBeat;
const scheduleAheadTime = 0.1;

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
    Array.from(stepSamples)
      .filter(Boolean)
      .map(f => typeof f === 'function' ? f() : f)
      .filter(f => f instanceof AudioBuffer)
      .forEach(sample => playSampleAt(audioContext, sample, nextStepTime))

    currentStep = (currentStep + 1) % pattern.length;
    nextStepTime += stepDuration;
  }

  requestAnimationFrame(() => scheduler(audioContext));
}

function playSampleAt(audioContext, sample, time) {
  const buffer = sample;
  if (!buffer) return;

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(time);
}
