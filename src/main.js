import {createMeter} from "./meter.js";
import Meyda from "meyda";

const btn = document.getElementById('hold');

let audioContext, looper, stream, src;
const fluxMailboxSAB = new SharedArrayBuffer(8); // [Float32 payload][Int32 seq]
const fluxWorker = new Worker(
  new URL('./flux.worker.js', import.meta.url),   // <— Vite resolves & bundles
  { type: 'module' }
);
// (optional) quick diagnostics
fluxWorker.onmessage = (e) => {
  if (e.data?.type === 'ack') console.log('flux worker: ack');
  if (e.data?.type === 'msg') console.log('flux worker:', e.data.msg);
};
fluxWorker.onerror = (e) => console.error('flux worker error', e);

async function ensureAudio() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });

  await audioContext.audioWorklet.addModule('/src/noise-gate.worklet.js');
  await audioContext.audioWorklet.addModule('/src/tap.worklet.js');
  await audioContext.audioWorklet.addModule('/src/param-source.worklet.js');
  await audioContext.audioWorklet.addModule('/src/looper.worklet.js');

  // Ask for mono mic
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: true,
      autoGainControl: false,
    }
  });

  src = new MediaStreamAudioSourceNode(audioContext, { mediaStream: stream });

  // const fluxWorker = new Worker('/flux.worker.js', { type:'module' });
  fluxWorker.postMessage({ type: 'init', mailboxSAB: fluxMailboxSAB, sampleRate: audioContext.sampleRate });


  const gate = new AudioWorkletNode(audioContext, 'noise-gate', {
    parameterData: { threshold: [-50], ratio: 6, mix: 1,}
  });

  looper = new AudioWorkletNode(audioContext, 'two-second-looper');

  const tap = new AudioWorkletNode(audioContext, 'tap-node', {
    processorOptions: { blockSize: 1024, downsample: 3 },
    parameterData: { passthrough: 1 }
  });

  const fluxParam = new AudioWorkletNode(audioContext, 'param-source', {
    processorOptions: { mailboxSAB: fluxMailboxSAB },
  });


  // main route -> input through looper
  src
    .connect(gate)
    .connect(tap) // tap in to the signal to forward it to the web worker
    .connect(looper)
    .connect(audioContext.destination);

  tap.port.onmessage = (e) => {
    // e.data.audio is a transferred Float32Array; rewrap to keep zero-copy down the line
    const chunk = new Float32Array(e.data.audio);
    fluxWorker.postMessage({ type: 'data', audio: chunk }, [chunk.buffer]);
  };
  fluxParam.connect(looper.parameters.get('record'));

  const fluxMeter = createMeter(document.getElementById('meter-area'), { label: 'Flux Gate', map: 'linear' });
  fluxMeter.bindMailbox(fluxMailboxSAB);
  const analyser = new AnalyserNode(audioContext, { fftSize: 1024, map: 'db',      // <-- log scale
    dbFloor: -60,   // -60 dBFS → 0%
    });
  gate.connect(analyser); // post-noise-gate signal
  const meter2 = createMeter(document.getElementById('meter-area'), {
    label: 'Input RMS', threshold: 0.2, width: 180,
    map: 'db',      // <-- log scale
    dbFloor: -60,   // -60 dBFS → 0%
  });
  meter2.bindAnalyser(analyser, { fftSize: 1024 });
  const anaLoop = new AnalyserNode(audioContext, { fftSize: 1024 });
  looper.connect(anaLoop);
  const meter3 = createMeter(document.getElementById('meter-area'), {
    label: 'Looper RMS', threshold: 0.2,
    map: 'db',      // <-- log scale
    dbFloor: -60,   // -60 dBFS → 0%
  });
  meter3.bindAnalyser(anaLoop);
  const debugMeter = createMeter(document.getElementById('meter-area'), { label: 'Debug' });
  setInterval(()=> debugMeter.setValue(Math.random()), 300);

}

function setRecording(isOn) {
  if (!looper) return;
  const p = looper.parameters.get('record');
  // schedule at the exact audio time for click-free transitions
  p.setValueAtTime(isOn ? 1 : 0, audioContext.currentTime);
}

// Start audio on first user gesture, then toggle record while pressed
btn.addEventListener('pointerdown', async () => {
  await ensureAudio();
  if (audioContext.state !== 'running') await audioContext.resume();
  // start a fresh recording (looper resets on record rising edge)
  setRecording(true);
  btn.textContent = 'Recording… (release to loop)';
});

btn.addEventListener('pointerup', () => {
  setRecording(false);
  btn.textContent = 'Hold to record (2s)';
});

// Safety for pointer-cancel (scroll, etc.)
btn.addEventListener('pointercancel', () => {
  setRecording(false);
  btn.textContent = 'Hold to record (2s)';
});

// Optional: spacebar as a “hold”
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    btn.dispatchEvent(new PointerEvent('pointerdown'));
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    btn.dispatchEvent(new PointerEvent('pointerup'));
    e.preventDefault();
  }
});
