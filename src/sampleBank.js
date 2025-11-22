let LN2 = {}

export async function loadLN2(audioContext) {
  const [
    kick,
    snare,
    closedHiHat,
    tambourin,
    crash
  ] = await Promise.all([
    '/LN2 BASS DR.wav',
    '/LN2 SNAR DR.wav',
    '/LN2 CLHH.wav',
    '/LN2 TAMBOURN.wav',
    '/LN2 CRASH.wav'
  ].map(path => loadSample(audioContext, path)))

  LN2 = Object.freeze({kick, snare, closedHiHat, tambourin, crash})
  return LN2
}

async function loadSample(audioContext, path) {
  const res = await fetch(path);
  const arrayBuf = await res.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuf);
}


