import {createMeter} from "./meter.js";

// buttons
const btn = document.getElementById('hold');

// log helper
const logType = new Map([['msg', console.log]])
const log = e => logType.get(e?.data?.type)?.(`${e?.data?.from}:`, e?.data?.message)

// init worker threads
const fluxWorker = new Worker(new URL('./flux.worker.js', import.meta.url), {type: 'module'});
fluxWorker.onmessage = log
fluxWorker.onerror = (e) => console.error('flux worker error', e);

// shared buffers
const fluxMailboxSAB = new SharedArrayBuffer(8); // [Float32 payload][Int32 seq]

// audio setup
let audioContext, looper, stream, microphoneInput, recorder, sample;


let pattern = [[]]

let bpm = 120;
const stepsPerBeat = 4;                  // 16th notes
const stepDuration = 60 / bpm / stepsPerBeat;

let currentStep = 0;
let nextStepTime = audioContext?.currentTime + 0.1; // start a bit in future
const scheduleAheadTime = 0.1;          // seconds (how far we look ahead)

async function loadSample(audioContext, path) {
  const res = await fetch(path);
  const arrayBuf = await res.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuf);
}

function playSampleAt(audioContext, sample, time) {
  const buffer = sample;
  if (!buffer) return;

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(time);
}

function normalizeRMS(samples, targetDb = -20, peakLimitDb = -1) {
  const targetRMS = Math.pow(10, targetDb / 20);      // e.g. -20 dB
  const peakLimit = Math.pow(10, peakLimitDb / 20);   // e.g. -1 dB

  let sumSq = 0;
  let maxAbs = 0;

  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sumSq += v * v;
    const a = Math.abs(v);
    if (a > maxAbs) maxAbs = a;
  }

  if (samples.length === 0 || sumSq === 0) return samples;

  const rms = Math.sqrt(sumSq / samples.length);

  // scale factor needed to hit target RMS
  const rmsScale = targetRMS / rms;

  // scale factor needed to keep peaks under peakLimit
  const peakScale = maxAbs > 0 ? peakLimit / maxAbs : Infinity;

  // choose the smaller one so we respect both constraints
  const scale = Math.min(rmsScale, peakScale);

  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    out[i] = samples[i] * scale;
  }

  return out;
}

function audioBufferFromSAB(audioContext, sab, options = {}) {
  const {
    channels = 1,
    sampleRate = audioContext.sampleRate,
    interleaved = false, // set true if SAB is LRLRLR...
  } = options;

  const sabView = new Float32Array(sab);
  const length = sabView.length / (interleaved ? channels : 1);
  const buffer = audioContext.createBuffer(channels, length, sampleRate);

  if (!interleaved) {
    if (channels === 1) {
      buffer.copyToChannel(sabView, 0);
    } else {
      const samplesPerChannel = length;
      for (let ch = 0; ch < channels; ch++) {
        const start = ch * samplesPerChannel;
        const end = start + samplesPerChannel;
        buffer.copyToChannel(sabView.subarray(start, end), ch);
      }
    }
  } else {
    // Deinterleave LRLRLR... into separate channels
    for (let ch = 0; ch < channels; ch++) {
      const channelData = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        channelData[i] = sabView[i * channels + ch];
      }
    }
  }

  return buffer;
}

function scheduler(audioContext) {
  const now = audioContext.currentTime;

  while (nextStepTime < now + scheduleAheadTime) {
    const stepSamples = pattern[currentStep] ?? []
    stepSamples
      .filter(Boolean)
      .map(f => typeof f === 'function' ? f() : f)
      .filter(f => f instanceof AudioBuffer)
      .forEach(sample => playSampleAt(audioContext, sample, nextStepTime))

    currentStep = (currentStep + 1) % pattern.length;
    nextStepTime += stepDuration;
  }

  requestAnimationFrame(() => scheduler(audioContext));
}


async function ensureAudio() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)({latencyHint: 'interactive'});
  nextStepTime = audioContext?.currentTime + 0.1; // start a bit in future
}

async function setupLoop() {
  const [
    kick,
    snare,
    closedHiHat,
    tambourin,
    crash
  ] = await Promise.all([
    loadSample(audioContext, '/LN2 BASS DR.wav'),
    loadSample(audioContext, '/LN2 SNAR DR.wav'),
    loadSample(audioContext, '/LN2 CLHH.wav'),
    loadSample(audioContext, '/LN2 TAMBOURN.wav'),
    loadSample(audioContext, '/LN2 CRASH.wav')
  ])

  pattern = [
    [],
    [],
    [],
    [],

    [closedHiHat],
    [],
    [],
    [],

    [],
    [],
    [],
    [],

    [closedHiHat],
    [],
    [],
    [],
  ]

  scheduler(audioContext)

  await audioContext.audioWorklet.addModule('/src/noise-gate.worklet.js');
  await audioContext.audioWorklet.addModule('/src/tap.worklet.js');
  await audioContext.audioWorklet.addModule('/src/param-source.worklet.js');
  await audioContext.audioWorklet.addModule('/src/recorder.worklet.js');

  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
    }
  });

  microphoneInput = new MediaStreamAudioSourceNode(audioContext, {mediaStream: stream});

  fluxWorker.postMessage({type: 'init', mailboxSAB: fluxMailboxSAB, sampleRate: audioContext.sampleRate});

  const gate = new AudioWorkletNode(audioContext, 'noise-gate', {
    parameterData: {threshold: [-50], ratio: 6, mix: 1,}
  });

  recorder = new AudioWorkletNode(audioContext, 'recorder');

  recorder.port.onmessage = e => {
    if (e.data.type === 'msg') {
      // console.log(e.data.msg)
    } else if (e.data.audio) {
      let raw = e.data.audio
      // let normalized = normalizeRMS(raw, -20, -1);
      // console.log(normalized.slice(0, 100));
      let sample = audioBufferFromSAB(audioContext, raw);
      pattern[0][0] = sample
      // pattern[3][0] = sample
    }
  }

  const tap = new AudioWorkletNode(audioContext, 'tap-node', {
    processorOptions: {blockSize: 1024, downsample: 3},
    parameterData: {passthrough: 1}
  });

  tap.port.onmessage = (e) => {
    const chunk = new Float32Array(e.data.audio);
    fluxWorker.postMessage({type: 'data', audio: chunk}, [chunk.buffer]);
  };

  const fluxParam = new AudioWorkletNode(audioContext, 'param-source', {
    processorOptions: {mailboxSAB: fluxMailboxSAB},
  });

  // fluxParam.port.onmessage = e => console.log(e.data)

  const delay = audioContext.createDelay(1.0);
  delay.delayTime.value = 0.01;

  const hp = audioContext.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 80

  const comp = audioContext.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 24;
  comp.ratio.value = 3;
  comp.attack.value = 0.005;
  comp.release.value = 0.2;

  const recordGain = audioContext.createGain();
  recordGain.gain.value = 0.8;



  // capturing sound
  microphoneInput
    .connect(gate)
    .connect(tap) // tap in to the signal to forward it to the web worker
    .connect(delay)
    .connect(hp)
    .connect(comp)
    .connect(recordGain)
    .connect(recorder)

  const recordParam = recorder.parameters.get('record');
  recordParam.cancelScheduledValues(0);
  recordParam.value = 0;  // 👈 crucial
  fluxParam.connect(recordParam);



  // meters

  // flux gate output
  const fluxMeter = createMeter(document.getElementById('meter-area'), {
    label: 'Flux Gate',
    map: 'linear'
  });
  fluxMeter.bindMailbox(fluxMailboxSAB);

  // noise gate output
  const analyser = new AnalyserNode(audioContext, {fftSize: 1024});
  gate.connect(analyser); // post-noise-gate signal
  const meter2 = createMeter(document.getElementById('meter-area'), {
    label: 'Input RMS',
    threshold: 0.2,
    map: 'db',
    dbFloor: -60,
  });
  meter2.bindAnalyser(analyser, {fftSize: 1024});
}


// button

async function setRecording(isOn) {
  if (!recorder) return;
  // const p = recorder.parameters.get('record');
  // p.setValueAtTime(isOn ? 1 : 0, audioContext.currentTime);
}

async function toggleAudio() {
    await ensureAudio()
    await audioContext.resume()

  if (!recorder) {
    await setupLoop()
  }

  await setRecording(true)
  btn.textContent = 'pause'
  // }
  // else {
  //   await setRecording(false)
  //   await audioContext.suspend()
  //   btn.textContent = 'play'
  //   return true
  // }
}

btn.addEventListener('click', async () => {
  await toggleAudio();
});

btn.addEventListener('pointercancel', () => {
  setRecording(false);
  btn.textContent = 'play';
});
