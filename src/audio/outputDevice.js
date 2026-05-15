// The currently-selected output device id. `null` = system default.
// Set via the output-source dropdown; `applyOutputDevice` honors it on the
// AudioContext via `setSinkId`. Mirrors the shape of `microphoneInput.js`.

let currentDeviceId = null

export function setOutputDeviceId(id) {
  currentDeviceId = id || null
}

export function getOutputDeviceId() {
  return currentDeviceId
}

/**
 * Is `AudioContext.setSinkId` available in this browser? Static check —
 * usable before any AudioContext exists, so the UI can hide / disable the
 * selector accordingly.
 */
export const isOutputSelectionSupported =
  typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype

/**
 * Apply the chosen output device to an AudioContext. Silent no-op on
 * browsers without `setSinkId`. If the chosen device has gone away
 * (Bluetooth unplugged, USB removed, etc.) we fall back to the system
 * default rather than leaving the user with no output.
 */
export async function applyOutputDevice(audioContext) {
  if (!audioContext || typeof audioContext.setSinkId !== 'function') return
  try {
    await audioContext.setSinkId(currentDeviceId ?? '')
  } catch (e) {
    if (e.name !== 'NotFoundError' && e.name !== 'NotAllowedError') {
      console.warn('setSinkId failed', e)
      return
    }
    console.warn(`output device ${currentDeviceId} unavailable, falling back to default`, e)
    currentDeviceId = null
    try { await audioContext.setSinkId('') } catch {}
  }
}
