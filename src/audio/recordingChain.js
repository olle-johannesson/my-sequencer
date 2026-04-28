import {audioBufferFromSAB} from "../dsp/audioBufferFromFloatArray.js";
import {FEATURE_COUNT} from "../util/mailbox.js";
import {scheduleSample} from "../patterns/effectPattern.js";
import {clearSample} from "../patterns/samplePattern.js";
import {analysisBlockSize, spectrumSize} from '../config.js'

const analysisWorker = new Worker(new URL('../workers/analysis.worker.js', import.meta.url), {type: 'module'});
analysisWorker.onerror = (e) => console.error('analysis worker error', e);

const postProcessWorker = new Worker(new URL('../workers/postprocess.worker.js', import.meta.url), {type: 'module'});
postProcessWorker.onerror = (e) => console.error('post-process Worker error', e);
// postProcessWorker.onmessage = (e) =>
//   addNewRecordedSample(audioBufferFromSAB(audioContext, e.data.samples), scheduleSample, clearSample)

// shared buffers
const audioFeatureSAB = new SharedArrayBuffer(
  Int32Array.BYTES_PER_ELEMENT + FEATURE_COUNT * Float32Array.BYTES_PER_ELEMENT
);

const noiseSpectrumSAB = new SharedArrayBuffer(
  Int32Array.BYTES_PER_ELEMENT + spectrumSize * Float32Array.BYTES_PER_ELEMENT
);


/**
 * Creates the microphone input chain with analysis and recording
 *  - microphone input
 *  - tap worklet sends data to analysis thread
 *  - output from analysis thread side-chains some filters and turns recording on/off on a slightly delayed recorder worklet
 */
export async function setupRecordingChain(audioContext, microphoneStream, callBacks = {}) {
  const microphoneInputNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream: microphoneStream});

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

  // Create analysis tap
  const tap = new AudioWorkletNode(audioContext, 'tap-node', {
    processorOptions: {blockSize: analysisBlockSize, downsample: 1},
    parameterData: {passthrough: 1}
  });

  // Create analysis reader (outputs control signals)
  const analysisReader = new AudioWorkletNode(audioContext, 'analysis-reader', {
    numberOfInputs: 0,
    numberOfOutputs: 3,
    outputChannelCount: [1, 1, 1],
    processorOptions: {
      mailboxSAB: audioFeatureSAB,
      featureCount: FEATURE_COUNT
    },
  });

  // Create recorder
  const recorder = new AudioWorkletNode(audioContext, 'recorder');

  // Input processing chain
  const delay = audioContext.createDelay(1.0);
  delay.delayTime.value = 0.01;

  const hp = audioContext.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 80;

  const comp = audioContext.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  comp.attack.value = 0.005;
  comp.release.value = 0.2;

  const recordGain = audioContext.createGain();
  recordGain.gain.value = 0.8;

  // Wire up input chain
  microphoneInputNode
    .connect(tap)
    .connect(delay)
    .connect(hp)
    .connect(comp)
    .connect(recordGain)
    .connect(recorder);

  // Connect analysis reader to control parameters
  const recordParam = recorder.parameters.get('record');
  analysisReader.connect(recordParam, 0);
  analysisReader.connect(hp.frequency, 1);
  analysisReader.connect(recordGain.gain, 2);

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
        callBacks?.onRecordStart?.()
        // audioToggleLabel.classList.add('recording');
        break;
      case 'rec end':
        callBacks?.onRecordStop?.()
        // audioToggleLabel.classList.remove('recording');
        break;
    }
  };

  // Setup analysis tap
  tap.port.onmessage = (e) => {
    const chunk = new Float32Array(e.data.audio);
    analysisWorker.postMessage({type: 'data', audio: chunk}, [chunk.buffer]);
  };

  return {
    microphoneInputNode,
    tap,
    recorder,
    analysisReader,
    startRecordingSamples: (onNewRecordedSample) => postProcessWorker.onmessage = (e) =>
      onNewRecordedSample(audioBufferFromSAB(audioContext, e.data.samples), scheduleSample, clearSample)
  };
}
