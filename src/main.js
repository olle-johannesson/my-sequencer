import {addDrumSample, addSample, bpm, clearAllSamples, currentStep, scheduler} from "./looper.js";
import {audioBufferFromSAB} from "./dsp/audioBufferFromFloatArray.js";
import {loadLN2} from "./sampleBank.js";
import {FEATURE_COUNT} from "./util/mailbox.js";
import {DRUM_MAP, initMagenta, magentaIsReady, makePattern} from "./pattern.js";
import {getNormallyDistributedNumber} from "./util/random.js";

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
postProcessWorker.onmessage = (e) => {
  const sample = audioBufferFromSAB(audioContext, e.data.samples);
  const numberOfTimesToAddSample = Math.round(getNormallyDistributedNumber(2, 0.5));
  for (let i = 0; i < numberOfTimesToAddSample; i++) {
    addSample(Math.floor(Math.random() * 16), sample);
  }
}

// shared buffers
const audioFeatureSAB = new SharedArrayBuffer(
  Int32Array.BYTES_PER_ELEMENT + FEATURE_COUNT * Float32Array.BYTES_PER_ELEMENT
);

const noiseSpectrumSAB = new SharedArrayBuffer(
  Int32Array.BYTES_PER_ELEMENT + spectrumSize * Float32Array.BYTES_PER_ELEMENT
);


async function ensureAudio() {
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

  const r = document.querySelector(':root');

  function updateMeter() {
    let measured = 300 * measurePeakVolume()
    r.style.setProperty('--shadow-width', `${measured}px`);
    requestAnimationFrame(updateMeter);
  }

  const LM2 = await loadLN2(audioContext);
  // const kawai = await loadKawaii(audioContext)
  makePattern().then(p => {
    const drumPattern = p.notes
      .map(note => ({drum: DRUM_MAP[note.pitch], onset: note.quantizedStartStep}))
      .filter(n => n.drum)

    let usused = new Set(drumPattern.map(n => n.drum)).difference(new Set(Object.keys(LM2)))
    if (usused.size) {
      console.debug('unused drum samples:', [...usused])
    }

    drumPattern
      .map(n => ({...n, drum: LM2[n.drum]}))
      .forEach(({drum, onset}) => addDrumSample(onset, drum))
  })

  updateMeter()
  scheduler(audioContext, masterGain)
}


// button

btn.addEventListener('click', async () => {
  const root = document.querySelector(':root');

  if (isPlaying) {
    btn.classList.remove(DISCO_CLASS);
    await audioContext.suspend()
    clearAllSamples()
    isPlaying = false
  } else {
    isPlaying = true
    await ensureAudio()

    if (!magentaIsReady) {
      const s = document.createElement('span');
      s.classList.add(LOADER_CLASS)
      const originalInnertext = btn.innerHTML
      btn.innerText = ""
      btn.appendChild(s);

      await initMagenta()

      btn.removeChild(s)
      btn.innerHTML = originalInnertext
      s.classList.remove(LOADER_CLASS)
    }

    btn.classList.add(DISCO_CLASS);
    startLoop()
  }
})

btn.addEventListener('pointercancel', () => {
  setRecording(false);
  btn.textContent = 'play';
});

