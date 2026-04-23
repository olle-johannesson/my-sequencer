import {allPresets} from '../effects/effectSwitch.js'
import {thunk} from '../util/thunk.js'

function getRange(key, value) {
  const k = key.toLowerCase()
  if (k === 'ratehz') return {min: 0.1, max: 30, step: 0.1}
  if (k === 'rate') return {min: 0, max: 30, step: 0.1}
  if (k.includes('hz') || k === 'basehz' || k === 'depthhz') return {min: 20, max: 20000, step: 1}
  if (k === 'q') return {min: 0.1, max: 30, step: 0.1}
  if (k === 'wet' || k === 'dry' || k === 'depth' || k === 'duty' || k === 'duckdry') return {min: 0, max: 1, step: 0.01}
  if (k.includes('gain') || k === 'outgain' || k === 'makeupgain') return {min: 0, max: 3, step: 0.01}
  if (k.includes('ms') && !k.includes('hz')) return {min: 0, max: 1000, step: 1}
  if (k.includes('time') || k.includes('seconds')) return {min: 0.001, max: 5, step: 0.001}
  if (k.includes('bitdepth')) return {min: 1, max: 16, step: 1}
  if (k === 'ratereduction' || k.includes('rrstart') || k.includes('rrend')) return {min: 0.01, max: 1, step: 0.01}
  if (k === 'pitchratio') return {min: 0.25, max: 4, step: 0.001}
  if (k === 'subdivision') return {min: 1, max: 16, step: 1}
  if (k === 'amount') return {min: 0, max: 1, step: 0.01}
  if (k === 'decay') return {min: 0.1, max: 10, step: 0.1}
  if (k === 'reverse') return {min: 0, max: 1, step: 1}
  if (k === 'feedback') return {min: 0, max: 0.95, step: 0.01}
  if (k === 'dur') return {min: 0.01, max: 2, step: 0.01}
  return {min: 0, max: Math.max(value * 3, 1), step: value >= 10 ? 1 : 0.01}
}

function flatten(obj, prefix = '') {
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flatten(v, key))
    } else if (typeof v === 'number') {
      result[key] = v
    }
  }
  return result
}

function unflatten(flat, original) {
  const result = JSON.parse(JSON.stringify(original))
  for (const [dotKey, value] of Object.entries(flat)) {
    const parts = dotKey.split('.')
    let target = result
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in target)) target[parts[i]] = {}
      target = target[parts[i]]
    }
    target[parts[parts.length - 1]] = value
  }
  return result
}

const PANEL_CSS = `
  position:fixed; top:10px; right:10px;
  background:#1a1a2e; color:#eee; padding:12px;
  border-radius:8px; font-family:monospace; font-size:11px;
  z-index:9999; width:300px; max-height:90vh; overflow-y:auto;
  box-shadow:0 4px 20px rgba(0,0,0,0.5);
`

export function createPresetTuner(effectSwitch, audioCtx, inputNode, outputNode) {
  const panel = document.createElement('div')
  panel.style.cssText = PANEL_CSS

  // Header (draggable)
  const header = document.createElement('div')
  header.style.cssText = 'font-size:13px;font-weight:bold;margin-bottom:8px;cursor:grab;user-select:none;display:flex;justify-content:space-between;'
  header.innerHTML = '<span>Preset Tuner</span>'
  const minimizeBtn = document.createElement('span')
  minimizeBtn.textContent = '_'
  minimizeBtn.style.cursor = 'pointer'
  header.appendChild(minimizeBtn)
  panel.appendChild(header)

  // Make draggable
  let dragging = false, dx = 0, dy = 0
  header.addEventListener('mousedown', e => {
    dragging = true
    dx = e.clientX - panel.offsetLeft
    dy = e.clientY - panel.offsetTop
    header.style.cursor = 'grabbing'
  })
  document.addEventListener('mousemove', e => {
    if (!dragging) return
    panel.style.left = (e.clientX - dx) + 'px'
    panel.style.top = (e.clientY - dy) + 'px'
    panel.style.right = 'auto'
  })
  document.addEventListener('mouseup', () => {
    dragging = false
    header.style.cursor = 'grab'
  })

  // Content wrapper (for minimize)
  const content = document.createElement('div')
  panel.appendChild(content)
  minimizeBtn.addEventListener('click', () => {
    content.style.display = content.style.display === 'none' ? '' : 'none'
  })

  // Preset selector
  const select = document.createElement('select')
  select.style.cssText = 'width:100%;padding:4px;margin-bottom:8px;background:#0f0f23;color:#eee;border:1px solid #444;border-radius:3px;'
  const emptyOpt = document.createElement('option')
  emptyOpt.value = ''
  emptyOpt.textContent = '-- select preset --'
  select.appendChild(emptyOpt)
  for (const name of Object.keys(allPresets)) {
    const opt = document.createElement('option')
    opt.value = name
    opt.textContent = `${name} (${allPresets[name].chain})`
    select.appendChild(opt)
  }
  content.appendChild(select)

  // Sliders container
  const slidersDiv = document.createElement('div')
  content.appendChild(slidersDiv)

  // Buttons
  const buttonsDiv = document.createElement('div')
  buttonsDiv.style.cssText = 'margin-top:8px;display:flex;gap:4px;'
  content.appendChild(buttonsDiv)

  const exportBtn = document.createElement('button')
  exportBtn.textContent = 'Copy JSON'
  exportBtn.style.cssText = 'flex:1;padding:6px;background:#2a6;color:#fff;border:none;cursor:pointer;border-radius:4px;font-family:monospace;'
  buttonsDiv.appendChild(exportBtn)

  const offBtn = document.createElement('button')
  offBtn.textContent = 'Off'
  offBtn.style.cssText = 'padding:6px 12px;background:#a33;color:#fff;border:none;cursor:pointer;border-radius:4px;font-family:monospace;'
  buttonsDiv.appendChild(offBtn)

  let currentChainName = null
  let currentValues = {}
  let originalPreset = null

  function buildSliders(presetObj) {
    slidersDiv.innerHTML = ''
    const flat = flatten(presetObj)
    currentValues = {...flat}

    for (const [key, value] of Object.entries(flat)) {
      const row = document.createElement('div')
      row.style.cssText = 'margin-bottom:6px;'

      const label = document.createElement('div')
      label.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:2px;'
      const nameSpan = document.createElement('span')
      nameSpan.textContent = key
      nameSpan.style.opacity = '0.7'
      const valSpan = document.createElement('span')
      valSpan.textContent = formatVal(value)
      valSpan.style.color = '#7af'
      label.appendChild(nameSpan)
      label.appendChild(valSpan)

      const range = getRange(key.split('.').pop(), value)
      const slider = document.createElement('input')
      slider.type = 'range'
      slider.min = range.min
      slider.max = range.max
      slider.step = range.step
      slider.value = value
      slider.style.cssText = 'width:100%;accent-color:#7af;'

      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value)
        currentValues[key] = v
        valSpan.textContent = formatVal(v)
        applyCurrentValues()
      })

      row.appendChild(label)
      row.appendChild(slider)
      slidersDiv.appendChild(row)
    }
  }

  function formatVal(v) {
    if (v % 1 === 0) return String(v)
    if (Math.abs(v) >= 100) return v.toFixed(1)
    if (Math.abs(v) >= 1) return v.toFixed(3)
    return v.toFixed(4)
  }

  function applyCurrentValues() {
    if (!currentChainName || !originalPreset) return
    const preset = unflatten(currentValues, originalPreset)
    effectSwitch.activate(currentChainName, preset, audioCtx.currentTime, inputNode, outputNode)
  }

  select.addEventListener('change', () => {
    const name = select.value
    if (!name) return
    const entry = allPresets[name]
    currentChainName = entry.chain
    originalPreset = thunk(entry.preset)
    buildSliders(originalPreset)
    effectSwitch.activate(currentChainName, originalPreset, audioCtx.currentTime, inputNode, outputNode)
  })

  exportBtn.addEventListener('click', () => {
    if (!originalPreset) return
    const preset = unflatten(currentValues, originalPreset)
    console.log(preset)
    const json = JSON.stringify(preset, null, 2)
    navigator.clipboard.writeText(json).then(() => {
      exportBtn.textContent = 'Copied!'
      setTimeout(() => exportBtn.textContent = 'Copy JSON', 1500)
    })
  })

  offBtn.addEventListener('click', () => {
    effectSwitch.deactivate()
    select.value = ''
    slidersDiv.innerHTML = ''
    currentChainName = null
    currentValues = {}
    originalPreset = null
  })

  document.body.appendChild(panel)
  return panel
}
