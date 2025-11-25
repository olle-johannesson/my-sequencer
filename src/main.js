import {addDrumSample, addSample, currentStep, scheduler} from "./looper.js";
import {audioBufferFromSAB} from "./dsp/audioBufferFromFloatArray.js";
import {loadLN2} from "./sampleBank.js";
import {FEATURE_COUNT} from "./util/mailbox.js";
import {DRUM_MAP, initMagenta, makePattern} from "./pattern.js";

// buttons
const btn = document.getElementById('hold');
const loader = document.getElementById('loader');

// init worker threads
const analysisWorker = new Worker(new URL('./workers/analysis.worker.js', import.meta.url), {type: 'module'});
analysisWorker.onerror = (e) => console.error('analysis worker error', e);

const postProcessWorker = new Worker(new URL('./workers/postprocess.worker.js', import.meta.url), {type: 'module'});
postProcessWorker.onerror = (e) => console.error('post-process Worker error', e);
postProcessWorker.onmessage = (e) => {
  let sample = audioBufferFromSAB(audioContext, e.data.samples);
  // addSample(Math.floor(currentStep), sample);
  addSample(Math.floor(Math.random() * 16), sample);
}
const analysisBlockSize = 1024
const spectrumSize = analysisBlockSize / 2

// shared buffers
const audioFeatureSAB = new SharedArrayBuffer(
  Int32Array.BYTES_PER_ELEMENT + FEATURE_COUNT * Float32Array.BYTES_PER_ELEMENT
);

const noiseSpectrumSAB = new SharedArrayBuffer(
  Int32Array.BYTES_PER_ELEMENT + spectrumSize * Float32Array.BYTES_PER_ELEMENT
);

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
  await audioContext.audioWorklet.addModule('/src/worklets/noise-gate.worklet.js');
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
    processorOptions: { blockSize: analysisBlockSize, downsample: 1 },
    parameterData: { passthrough: 1 }
  });

  tap.port.onmessage = (e) => {
    const chunk = new Float32Array(e.data.audio);
    analysisWorker.postMessage({ type: 'data', audio: chunk }, [chunk.buffer]);
  };

  const analysisReader = new AudioWorkletNode(audioContext, 'analysis-reader', {
    numberOfInputs: 0,
    numberOfOutputs: 3,
    outputChannelCount: [
      1, // novelty/flux (recording flag): 0 or 1
      1, // HPF Frequency: in Hz
      1  // Auto Gain: linear 0.25–4.0
    ],
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

  microphoneInput
    // .connect(gate)
    .connect(tap) // tap in to the signal to forward it to the web worker
    .connect(delay)
    .connect(hp)
    .connect(comp)
    .connect(recordGain)
    .connect(recorder)

  // connect analysis params to filter chain and record nodes
  const recordParam = recorder.parameters.get('record');
  recordParam.cancelScheduledValues(0);
  recordParam.value = 0;  // 👈 crucial
  analysisReader.connect(recordParam, 0);
  analysisReader.connect(hp.frequency, 1);
  analysisReader.connect(recordGain.gain, 2);


  const masterGain = audioContext.createGain()
  masterGain.gain.value = 0.25;

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = spectrumSize * 2;
  const buffer = new Float32Array(analyser.fftSize);

  masterGain.connect(analyser);
  analyser.connect(audioContext.destination);

  function measureVolume() {
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const x = buffer[i];
      sum += x * x;
    }
    const rms = Math.sqrt(sum / buffer.length);
    const peak = Math.max(...buffer.map(v => Math.abs(v)));

    return { rms, peak }
  }

  var r = document.querySelector(':root');
  function updateMeter() {
    const { rms, peak } = measureVolume();
    // values range ~0–1, though >1 possible if things are clipping
    // console.log({ rms, peak });
    let measured = 200 * peak
    r.style.setProperty('--shadow-width', `${measured}px`);
    requestAnimationFrame(updateMeter);
  }
  updateMeter();

  const LM2 = await loadLN2(audioContext);
  // const kawai = await loadKawaii(audioContext)
  makePattern().then(p => {
    const groove = p.notes.map(note => ({ drum: DRUM_MAP[note.pitch], onset: note.quantizedStartStep }))
      .filter(n => n.drum)

    let usused = new Set(groove.map(n => n.drum)).difference(new Set(Object.keys(LM2)))
    if (usused.size) console.warn('unused drum samples:', [...usused])

    groove.map(n => ({ ...n, drum: LM2[n.drum] }))
      .forEach(({drum, onset}) => addDrumSample(onset, drum))
  })

  scheduler(audioContext, masterGain)



  // meters

  // flux gate output
  // const fluxMeter = createMeter(document.getElementById('meter-area'), {
  //   label: 'Flux Gate',
  //   map: 'linear'
  // });
  // fluxMeter.bindMailbox(audioFeatureSAB);
  //
  // // noise gate output
  // const analyser = new AnalyserNode(audioContext, {fftSize: 1024});
  // gate.connect(analyser); // post-noise-gate signal
  // const meter2 = createMeter(document.getElementById('meter-area'), {
  //   label: 'Input RMS',
  //   threshold: 0.2,
  //   map: 'db',
  //   dbFloor: -60,
  // });
  // meter2.bindAnalyser(analyser, {fftSize: 1024});
}


// button

btn.addEventListener('click', async () => {
  // loading state
  var r = document.querySelector(':root');
  r.style.setProperty('--button-color', 'lightgreen');
  const s = document.createElement('span');
  s.classList.add('loader')
  const originalInnertext = btn.innerHTML
  btn.innerText = ""
  btn.appendChild(s);

  await initMagenta()

  // recording state
  btn.classList.add('disco');
  btn.removeChild(s)
  btn.innerHTML = originalInnertext
  await ensureAudio()
  await audioContext.resume()
  await setupLoop()
}, { once: true });

btn.addEventListener('pointercancel', () => {
  setRecording(false);
  btn.textContent = 'play';
});

