import {clearAllSamples, clearSample, rndBpm, scheduler, scheduleSample} from "./looper.js";
import {audioBufferFromSAB} from "./dsp/audioBufferFromFloatArray.js";
import {loadRandomDrums} from "./drums/loadRandomDrums.js";
import {FEATURE_COUNT} from "./util/mailbox.js";
import {continuePattern, initMagenta, magentaIsReady} from "./magentaHelper.js";
import {PITCH_TO_DRUM} from "./drums/drumNameMaps.js";
import {aConservativeSeed, addNewRecordedSample} from './pattern.js';
import {setupAudioContext, setupMicrophoneChain, setupMasterChain, createPeakMeter} from "./audio/audioSetup.js";
import {setupEffectButtons} from "./effects/effectsController.js";

const LOADER_CLASS = 'loader';
const DISCO_CLASS = 'disco';
const btn = document.getElementById('hold');
const analysisBlockSize = 1024;
const spectrumSize = analysisBlockSize / 2;

let audioContext, recorder;

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


async function startLoop() {
  rndBpm();

  // Setup audio context and worklets
  audioContext = await setupAudioContext(analysisBlockSize, spectrumSize, audioFeatureSAB);

  // Initialize workers
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

  // Setup microphone input chain
  const {tap, recorder: recorderNode} = await setupMicrophoneChain(
    audioContext,
    analysisBlockSize,
    spectrumSize,
    audioFeatureSAB
  );
  recorder = recorderNode;

  // Setup recorder callbacks
  recorder.port.onmessage = e => {
    switch (e.data.type) {
      case 'audio':
        postProcessWorker.postMessage({
          samples: e.data.audio,
          sampleRate: audioContext.sampleRate
        });
        break;
      case 'rec begin':
        btn.classList.add('recording');
        break;
      case 'rec end':
        btn.classList.remove('recording');
        break;
    }
  };

  // Setup analysis tap
  tap.port.onmessage = (e) => {
    const chunk = new Float32Array(e.data.audio);
    analysisWorker.postMessage({type: 'data', audio: chunk}, [chunk.buffer]);
  };

  // Setup master output chain
  const {masterGain, outputAnalyser} = setupMasterChain(audioContext, spectrumSize);

  // Setup effect buttons
  setupEffectButtons(audioContext, masterGain, outputAnalyser);

  // Setup peak meter
  const updateMeter = createPeakMeter(outputAnalyser);
  updateMeter();

  // Load drums and start pattern
  const drumSamples = await loadRandomDrums(audioContext);
  continuePattern(aConservativeSeed, 1.3).then(p => {
    p.notes
      .map(note => ({ drum: PITCH_TO_DRUM[note.pitch], onset: note.quantizedStartStep }))
      .filter(n => n.drum)
      .map(n => ({...n, drum: drumSamples[n.drum]}))
      .forEach(({drum, onset}) => scheduleSample(onset, drum));
  });

  // Start scheduler
  scheduler(audioContext, masterGain);
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
  await ensureMagentaIsLoaded();
  await startLoop();
  btn.classList.add(DISCO_CLASS);
  btn.addEventListener('click', stop, { once: true });
}

async function stop() {
  if (audioContext && audioContext.state !== 'suspended') {
    await audioContext.suspend();
  }
  clearAllSamples();
  btn.classList.remove(DISCO_CLASS);
  btn.addEventListener('click', start, { once: true });
}

btn.addEventListener('click', start, { once: true })
