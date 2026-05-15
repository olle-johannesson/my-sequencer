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

  // Keep the 'default' virtual entry separately — we need its groupId to
  // resolve which physical device is currently the system default, but
  // we don't want it in the dropdown (the dropdown shows real devices).
  const all = devices.filter(d => d.kind === 'audiooutput')
  const defaultEntry = all.find(d => d.deviceId === 'default')
  const audioOutputs = all.filter(d => d.deviceId && d.deviceId !== 'default')

  const previous = select.value

  select.replaceChildren(
    ...audioOutputs.map(d => {
      const opt = document.createElement('option')
      opt.value = d.deviceId
      opt.textContent = d.label || `Audio output ${d.deviceId.slice(0, 6)}…`
      return opt
    }),
  )

  if (previous && audioOutputs.some(d => d.deviceId === previous)) {
    select.value = previous
    return
  }

  // No previous selection — show whichever physical device the system is
  // currently routed to (the 'default' entry's groupId points us there).
  // If the entry isn't available (pre-permission, or a browser that
  // doesn't expose it), fall back to the first listed device.
  if (defaultEntry) {
    const physical = audioOutputs.find(d => d.groupId === defaultEntry.groupId)
    if (physical) {
      select.value = physical.deviceId
      return
    }
  }
  if (audioOutputs.length > 0) {
    select.value = audioOutputs[0].deviceId
  }
}
