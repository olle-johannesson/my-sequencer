let LN2 = {}

// Dont't load the crashes. I don't know who trained Magenta, but it can get pretty annoying with them.

export async function loadLN2(audioContext) {
  const [
    kick,
    snare,
    hihatClosed,
    hihatOpen,
    tomHigh,
    ride
  ] = await Promise.all([
    'LN2 BASS DR.wav',
    'LN2 SNAR DR.wav',
    'LN2 CLHH.wav',
    'LN2 OPHH.wav',
    'LN2 TOM DR.wav',
    'LN2 COWBELL.wav'
  ]
    // .map(path => `/Oberhiem DMX + LN2 + TOM/${path}`)
    .map(path => `/${path}`)
    .map(path => loadSample(audioContext, path)))

  LN2 = Object.freeze({kick, snare, hihatClosed, hihatOpen, tomHigh, ride})
  return LN2
}

export async function loadKawaii(audioContext) {
  const [
    kick,
    snare,
    hihatClosed,
    tomHigh,
    crash
  ] = await Promise.all([
    'BD3_ACOU.WAV',
    'CLAP_1.WAV',
    'HAT_C2.WAV',
    'LN2 TAMBOURN.wav',
    'CRASH.WAV'
  ]
    .map(path => `/KAWAI R-50e/${path}`)
    .map(path => loadSample(audioContext, path)))

  LN2 = Object.freeze({kick, snare, hihatClosed, tomHigh, crash})
  return LN2
}


async function loadSample(audioContext, path) {
  const res = await fetch(path);
  const arrayBuf = await res.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuf);
}


