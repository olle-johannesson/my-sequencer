// Output source selector — lets the user pick which audio device the
// AudioContext routes to via `setSinkId`. Mirrors `inputSourceSelect.js`
// in shape and behaviour: `populateOutputSources()` can be called any time,
// device labels are blank until mic permission has been granted (yes — the
// same gate covers output enumeration), so call it once on load (so the
// menu exists) and again after start() succeeds (so labels are filled in).
// `devicechange` events also re-populate so plug/unplug works live.

import {outputSourceSelect} from './uiHandles.js'

let onDeviceChange // caller's handler

export function setupOutputSourceSelect(handler) {
  onDeviceChange = handler

  populateOutputSources()
  navigator.mediaDevices.addEventListener('devicechange', populateOutputSources)

  const select = outputSourceSelect()
  if (!select) return
  select.addEventListener('change', () => {
    onDeviceChange?.(select.value || null)
  })
}

export async function populateOutputSources() {
  const select = outputSourceSelect()
  if (!select) return

  let devices = []
  try {
    devices = await navigator.mediaDevices.enumerateDevices()
  } catch (e) {
    console.warn('enumerateDevices failed', e)
    return
  }

  const audioOutputs = devices.filter(d => d.kind === 'audiooutput')
  const previous = select.value

  // Default option for "let the browser pick" — value="" means no exact deviceId.
  const defaultOpt = document.createElement('option')
  defaultOpt.value = ''
  defaultOpt.textContent = 'Default'

  select.replaceChildren(
    defaultOpt,
    ...audioOutputs.map(d => {
      const opt = document.createElement('option')
      opt.value = d.deviceId
      opt.textContent = d.label || `Audio output ${d.deviceId.slice(0, 6)}…`
      return opt
    }),
  )

  if (previous && audioOutputs.some(d => d.deviceId === previous)) {
    select.value = previous
  }
}
