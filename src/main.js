const btn = document.getElementById('hold');

let ac, looper, stream, src;

async function ensureAudio() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });

  await ac.audioWorklet.addModule('/src/noise-gate.worklet.js');
  await ac.audioWorklet.addModule('/src/looper.worklet.js');

  // Ask for mono mic
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: true,
      autoGainControl: false,
    }
  });
  src = new MediaStreamAudioSourceNode(ac, { mediaStream: stream });

  const noiseGate = new AudioWorkletNode(ac, 'noise-gate', {
    parameterData: {
      threshold: [-50],
      ratio: 6,
      mix: 1,
    },
  });
  looper = new AudioWorkletNode(ac, 'two-second-looper');

  // route: mic -> looper -> speakers
  src.connect(noiseGate).connect(looper).connect(ac.destination);
}

function setRecording(isOn) {
  if (!looper) return;
  const p = looper.parameters.get('record');
  // schedule at the exact audio time for click-free transitions
  p.setValueAtTime(isOn ? 1 : 0, ac.currentTime);
}

// Start audio on first user gesture, then toggle record while pressed
btn.addEventListener('pointerdown', async () => {
  await ensureAudio();
  if (ac.state !== 'running') await ac.resume();
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
