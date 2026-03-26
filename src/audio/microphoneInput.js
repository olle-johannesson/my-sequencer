export function createMicrophoneStream() {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 2,
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: false,
    }
  })
}

export function pauseMic(stream, node) {
  if (node) {
    try { node.disconnect(); } catch {}
    node = null
  }
  if (stream) {
    stream.getAudioTracks().forEach(t => (t.enabled = false));
    stream = null
  }

  return null
  // stream.getAudioTracks().forEach(t => (t.enabled = false));

  return stream
}

export async function getMicrophoneStream(stream) {
  if (!stream) {
    stream = await createMicrophoneStream()
  }
  stream.getAudioTracks().forEach(t => (t.enabled = true));
  return stream
}
