import {FEATURE_COUNT} from "../util/mailbox.js";

/**
 * Create an audio context and load all the worklets
 */
export async function setupAudioContext() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)({
    latencyHint: 'interactive'
  });

  // Load all worklets
  await Promise.all([
    audioContext.audioWorklet.addModule('/src/worklets/tap.worklet.js'),
    audioContext.audioWorklet.addModule('/src/worklets/analysis-reader.worklet.js'),
    audioContext.audioWorklet.addModule('/src/worklets/recorder.worklet.js'),
    audioContext.audioWorklet.addModule('/src/worklets/bitcrusher.worklet.js'),
    audioContext.audioWorklet.addModule('/src/worklets/grain-player.worklet.js'),
    audioContext.audioWorklet.addModule('/src/worklets/pitchshift.worklet.js'),
  ]);

  return audioContext;
}

/**
 * Creates the microphone input chain with analysis and recording
 *  - microphone input
 *  - tap worklet sends data to analysis thread
 *  - output from analysis thread side-chains some filters and turns recording on/off on a slightly delayed recorder worklet
 */
export async function setupMicrophoneChain(audioContext, analysisBlockSize, spectrumSize, audioFeatureSAB) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 2,
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: false,
    }
  });

  const microphoneInput = new MediaStreamAudioSourceNode(audioContext, {mediaStream: stream});

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
  comp.knee.value = 24;
  comp.ratio.value = 3;
  comp.attack.value = 0.005;
  comp.release.value = 0.2;

  const recordGain = audioContext.createGain();
  recordGain.gain.value = 0.8;

  // Wire up input chain
  microphoneInput
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

  return {
    stream,
    microphoneInput,
    tap,
    recorder,
    analysisReader
  };
}

/**
 * Creates the master output chain
 */
export function setupMasterChain(audioContext, spectrumSize) {
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.25;

  const outputAnalyser = audioContext.createAnalyser();
  outputAnalyser.fftSize = spectrumSize * 2;

  masterGain
    .connect(outputAnalyser)
    .connect(audioContext.destination);

  return {
    masterGain,
    outputAnalyser
  };
}

/**
 * Creates a peak meter that animates CSS
 */
export function createPeakMeter(outputAnalyser) {
  const buffer = new Float32Array(outputAnalyser.fftSize);
  const documentRoot = document.querySelector(':root');

  function measurePeakVolume() {
    outputAnalyser.getFloatTimeDomainData(buffer);
    return Math.max(...buffer.map(v => Math.abs(v)));
  }

  function updateMeter() {
    const measured = 300 * measurePeakVolume();
    documentRoot.style.setProperty('--shadow-width', `${measured}em`);
    requestAnimationFrame(updateMeter);
  }

  return updateMeter;
}
