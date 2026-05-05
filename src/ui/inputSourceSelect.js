// `populateInputSources()` can be called any time. It enumerates audio input
// devices and replaces the dropdown options. Device labels are blank until the
// browser has granted mic permission, so call it once on load (so the menu
// exists) and again after start() succeeds (so labels are filled in).
// `devicechange` events also re-populate so plug/unplug works live.
//
// iOS adaptations:
//  - The <label> text is rebranded "Audio device" + a small note, because
//    iOS routes input and output to the same physical device while
//    getUserMedia is active. The dropdown still works, but it picks both ends.
//  - enumerateDevices() on iOS often returns the same physical mic multiple
//    times (default, communications, the underlying device). We dedupe by
//    groupId so the menu isn't confusing.

import {inputSourceLabel, inputSourceNote, inputSourceSelect} from './uiHandles.js'
import {isIOS} from '../util/platform.js'

let onDeviceChange  // caller's handler

export function setupInputSourceSelect(handler) {
  onDeviceChange = handler

  if (isIOS) relabelForIOS()

  populateInputSources()
  navigator.mediaDevices.addEventListener('devicechange', populateInputSources)

  const select = inputSourceSelect()
  if (!select) return
  select.addEventListener('change', () => {
    onDeviceChange?.(select.value || null)
  })
}

function relabelForIOS() {
  const select = inputSourceSelect()
  if (!select) return
  const label = inputSourceLabel()
  if (label) label.textContent = 'Audio device'

  // Append a one-liner under the select explaining the iOS coupling.
  if (!inputSourceNote()) {
    const note = document.createElement('small')
    note.id = 'input-source-note'
    note.textContent = 'On iOS this also sets the playback device.'
    note.style.opacity = '0.6'
    select.insertAdjacentElement('afterend', note)
  }
}

export async function populateInputSources() {
  const select = inputSourceSelect()
  if (!select) return

  let devices = []
  try {
    devices = await navigator.mediaDevices.enumerateDevices()
  } catch (e) {
    console.warn('enumerateDevices failed', e)
    return
  }

  let audioInputs = devices.filter(d => d.kind === 'audioinput')
  if (isIOS) audioInputs = dedupeByGroup(audioInputs)

  const previous = select.value

  // Default option for "let the browser pick" — value="" means no exact deviceId.
  const defaultOpt = document.createElement('option')
  defaultOpt.value = ''
  defaultOpt.textContent = 'Default'

  select.replaceChildren(
    defaultOpt,
    ...audioInputs.map(d => {
      const opt = document.createElement('option')
      opt.value = d.deviceId
      opt.textContent = d.label || `Audio input ${d.deviceId.slice(0, 6)}…`
      return opt
    }),
  )

  if (previous && audioInputs.some(d => d.deviceId === previous)) {
    select.value = previous
  }
}

// iOS surfaces the same physical mic under multiple deviceIds (default,
// communications, the device itself) all sharing one groupId. Keep the first
// entry per group, preferring one with a real label if we have it.
function dedupeByGroup(devices) {
  const seen = new Map()
  for (const d of devices) {
    const key = d.groupId || d.deviceId
    const existing = seen.get(key)
    if (!existing || (!existing.label && d.label)) seen.set(key, d)
  }
  return [...seen.values()]
}
