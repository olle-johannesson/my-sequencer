import {clearAllSamples, clearSample, scheduler, scheduleSample} from "./looper.js";
import {audioBufferFromSAB} from "./dsp/audioBufferFromFloatArray.js";
import {loadRandomDrums} from "./drums/loadRandomDrums.js";
import {FEATURE_COUNT} from "./util/mailbox.js";
import {continuePattern, initMagenta, magentaIsReady} from "./magentaHelper.js";
import {DRUM_TO_PITCH, PITCH_TO_DRUM} from "./drums/drumNameMaps.js";
import {addNewRecordedSample} from './pattern.js'

const LOADER_CLASS = 'loader';
const DISCO_CLASS = 'disco';
const btn = document.getElementById('hold');
const analysisBlockSize = 1024
const spectrumSize = analysisBlockSize / 2
let audioContext, stream, microphoneInput, recorder, isPlaying = false;

// init worker threads
const analysisWorker = new Worker(new URL('./workers/analysis.worker.js', import.meta.url), {type: 'module'});
analysisWorker.onerror = (e) => console.error('analysis worker error', e);

const postProcessWorker = new Worker(new URL('./workers/postprocess.worker.js', import.meta.url), {type: 'module'});
postProcessWorker.onerror = (e) => console.error('post-process Worker error', e);
postProcessWorker.onmessage = (e) =>
  addNewRecordedSample(audioBufferFromSAB(audioContext, e.data.samples), scheduleSample, clearSample)

// shared buffers
const audioFeatureSAB = new SharedArrayBuffer(
  Int32Array.BYTES_PER_ELEMENT + FEATURE_COUNT * Float32Array.BYTES_PER_ELEMENT
);

const noiseSpectrumSAB = new SharedArrayBuffer(
  Int32Array.BYTES_PER_ELEMENT + spectrumSize * Float32Array.BYTES_PER_ELEMENT
);


async function ensureAudioContextIsRunning() {
  if (audioContext) {
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  } else {
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: 'interactive'
    });
  }
}

async function startLoop() {
  await audioContext.audioWorklet.addModule('/src/worklets/tap.worklet.js');
  await audioContext.audioWorklet.addModule('/src/worklets/analysis-reader.worklet.js');
  await audioContext.audioWorklet.addModule('/src/worklets/recorder.worklet.js');

  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: false,
    }
  });

  microphoneInput = new MediaStreamAudioSourceNode(audioContext, {mediaStream: stream});

  analysisWorker.postMessage({
    type: 'init',
    featureMailboxSAB: audioFeatureSAB,
    noiseMailboxSAB: noiseSpectrumSAB,
    sampleRate: audioContext.sampleRate,
    spectrumSize
  });

  postProcessWorker.postMessage({
    type: 'init',
    noiseMailboxSAB: noiseSpectrumSAB,
    sampleRate: audioContext.sampleRate,
    spectrumSize
  });

  recorder = new AudioWorkletNode(audioContext, 'recorder');
  recorder.port.onmessage = e => {
    switch (e.data.type) {
      case 'audio': {
        postProcessWorker.postMessage({
          samples: e.data.audio,
          sampleRate: audioContext.sampleRate
        });
        break;
      }
      case 'rec begin': {
        btn.classList.add('recording');
        break;
      }
      case 'rec end': {
        btn.classList.remove('recording')
        break;
      }
    }
  }

  const tap = new AudioWorkletNode(audioContext, 'tap-node', {
    processorOptions: {blockSize: analysisBlockSize, downsample: 1},
    parameterData: {passthrough: 1}
  });

  tap.port.onmessage = (e) => {
    const chunk = new Float32Array(e.data.audio);
    analysisWorker.postMessage({type: 'data', audio: chunk}, [chunk.buffer]);
  };

  const analysisReader = new AudioWorkletNode(audioContext, 'analysis-reader', {
    numberOfInputs: 0,
    numberOfOutputs: 3,
    outputChannelCount: [1, 1, 1],
    processorOptions: {
      mailboxSAB: audioFeatureSAB,
      featureCount: FEATURE_COUNT
    },
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

  const masterGain = audioContext.createGain()
  masterGain.gain.value = 0.25;

  const outputAnalyser = audioContext.createAnalyser();
  outputAnalyser.fftSize = spectrumSize * 2;
  const buffer = new Float32Array(outputAnalyser.fftSize);

  microphoneInput
    .connect(tap)
    .connect(delay)
    .connect(hp)
    .connect(comp)
    .connect(recordGain)
    .connect(recorder)

  const recordParam = recorder.parameters.get('record');
  analysisReader.connect(recordParam, 0);
  analysisReader.connect(hp.frequency, 1);
  analysisReader.connect(recordGain.gain, 2);

  masterGain
    .connect(outputAnalyser)
    .connect(audioContext.destination);

  function measurePeakVolume() {
    outputAnalyser.getFloatTimeDomainData(buffer);
    return Math.max(...buffer.map(v => Math.abs(v)));
  }

  const documentRoot = document.querySelector(':root');

  function updateMeter() {
    let measured = 300 * measurePeakVolume()
    documentRoot.style.setProperty('--shadow-width', `${measured}em`);
    requestAnimationFrame(updateMeter);
  }

  const initialDrumSeed = {
    notes: [
      { pitch: DRUM_TO_PITCH.kick, startTime: 0,   endTime: 0.5 },
      { pitch: DRUM_TO_PITCH.snare, startTime: 0.5, endTime: 1.0 },
    ],
    totalTime: 1.0,
  }

  const drumSamples = await loadRandomDrums(audioContext);
  continuePattern(initialDrumSeed, 1.3).then(p => {
    p.notes
      .map(note => ({ drum: PITCH_TO_DRUM[note.pitch], onset: note.quantizedStartStep }))
      .filter(n => n.drum)
      .map(n => ({...n, drum: drumSamples[n.drum]}))
      .forEach(({drum, onset}) => scheduleSample(onset, drum))
  })

  updateMeter()
  scheduler(audioContext, masterGain)
}


// button

function showLoader() {
  const originalInnerHtml = btn.innerHTML
  const loader = document.createElement('span');
  loader.classList.add(LOADER_CLASS)
  btn.innerText = ""
  btn.appendChild(loader);
  return () => {
    btn.removeChild(loader)
    btn.innerHTML = originalInnerHtml
    loader.classList.remove(LOADER_CLASS)
  }
}

async function ensureMagentaIsLoaded() {
  if (!magentaIsReady) {
    const removeLoader = showLoader()
    await initMagenta()
    removeLoader()
  }
}

async function start() {
  await ensureAudioContextIsRunning()
  await ensureMagentaIsLoaded()
  await startLoop()
  btn.classList.add(DISCO_CLASS);
  btn.addEventListener('click', stop, { once: true })
}

async function stop() {
  await audioContext.suspend()
  clearAllSamples()
  btn.classList.remove(DISCO_CLASS);
  btn.addEventListener('click', start, { once: true })
}

btn.addEventListener('click', start, { once: true })
