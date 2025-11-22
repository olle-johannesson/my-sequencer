import {createMeter} from "./meter.js";
import {nextStepTime, pattern, currentStep, scheduler, addSample} from "./looper.js";
import {audioBufferFromSAB} from "./dsp/audioBufferFromFloatArray.js";
import {loadLN2} from "./sampleBank.js";

// buttons
const btn = document.getElementById('hold');

// init worker threads
const fluxWorker = new Worker(new URL('./workers/flux.worker.js', import.meta.url), {type: 'module'});
fluxWorker.onerror = (e) => console.error('flux worker error', e);

const postProcessWorker = new Worker(new URL('./workers/postprocess.worker.js', import.meta.url), {type: 'module'});
postProcessWorker.onerror = (e) => console.error('post-process Worker error', e);
postProcessWorker.onmessage = (e) => {
  let sample = audioBufferFromSAB(audioContext, e.data.samples);
  addSample(Math.floor(currentStep), sample);
  addSample(Math.floor(Math.random() * 16), sample);
}

// shared buffers
const fluxMailboxSAB = new SharedArrayBuffer(8);

// audio setup
let audioContext, stream, microphoneInput, recorder;

async function ensureAudio() {
  if (audioContext) {
    return;
  }
  audioContext = new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: 'interactive'
  });
}

async function setupLoop() {
  const LM2 = await loadLN2(audioContext);
  addSample(0, LM2.kick)
  addSample(8, LM2.kick)
  addSample(10, LM2.kick)
  addSample(4, LM2.snare)
  addSample(12, LM2.snare)
  scheduler(audioContext)

  await audioContext.audioWorklet.addModule('/src/worklets/noise-gate.worklet.js');
  await audioContext.audioWorklet.addModule('/src/worklets/tap.worklet.js');
  await audioContext.audioWorklet.addModule('/src/worklets/param-source.worklet.js');
  await audioContext.audioWorklet.addModule('/src/worklets/recorder.worklet.js');

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
    parameterData: { threshold: [-50], ratio: 6, mix: 1 }
  });

  recorder = new AudioWorkletNode(audioContext, 'recorder');
  recorder.port.onmessage = e => {
    if (e.data.audio) {
      postProcessWorker.postMessage({
        samples: e.data.audio,
        sampleRate: audioContext.sampleRate });
    }
  }

  const tap = new AudioWorkletNode(audioContext, 'tap-node', {
    processorOptions: { blockSize: 1024, downsample: 3 },
    parameterData: { passthrough: 1 }
  });

  tap.port.onmessage = (e) => {
    const chunk = new Float32Array(e.data.audio);
    fluxWorker.postMessage({ type: 'data', audio: chunk }, [chunk.buffer]);
  };

  const fluxParam = new AudioWorkletNode(audioContext, 'param-source', {
    processorOptions: { mailboxSAB: fluxMailboxSAB },
  });

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

btn.addEventListener('click', async () => {
  btn.style.backgroundColor = 'red'
  await ensureAudio()
  await audioContext.resume()
  await setupLoop()
}, { once: true });

btn.addEventListener('pointercancel', () => {
  setRecording(false);
  btn.textContent = 'play';
});
