// The currently-selected input device id. null = browser default.
// Set via the input-source dropdown; createMicrophoneStream honors it.
let currentDeviceId = null

export function setMicDeviceId(id) {
  currentDeviceId = id || null
}

export function getMicDeviceId() {
  return currentDeviceId
}

const baseAudioConstraints = {
  channelCount: 2,
  echoCancellation: true,
  noiseSuppression: false,
  autoGainControl: false,
}

// Tries the user's selected deviceId first; if the device is gone (Bluetooth
// disconnected, USB unplugged, stale id from a previous session — common on
// iOS where deviceIds are session-scoped), fall back to the OS default rather
// than leaving the user with no mic.
export async function createMicrophoneStream() {
  if (currentDeviceId) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { ...baseAudioConstraints, deviceId: { exact: currentDeviceId } }
      })
    } catch (e) {
      if (e.name !== 'OverconstrainedError' && e.name !== 'NotFoundError') throw e
      console.warn(`mic device ${currentDeviceId} unavailable, falling back to default`, e)
      currentDeviceId = null
    }
  }
  return navigator.mediaDevices.getUserMedia({ audio: baseAudioConstraints })
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
  // If we already have a stream but its device differs from currentDeviceId,
  // tear it down so the next call picks the user's selection.
  if (stream && currentDeviceId) {
    const existingId = stream.getAudioTracks()[0]?.getSettings?.()?.deviceId
    if (existingId && existingId !== currentDeviceId) {
      stream.getAudioTracks().forEach(t => t.stop())
      stream = null
    }
  }
  if (!stream) {
    stream = await createMicrophoneStream()
  }
  stream.getAudioTracks().forEach(t => (t.enabled = true));
  return stream
}
