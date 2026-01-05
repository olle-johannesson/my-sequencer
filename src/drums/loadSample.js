export async function loadSample(audioContext, path) {
  const res = await fetch(path);
  const arrayBuf = await res.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuf);
}
