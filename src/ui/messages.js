const container = document.querySelector('#messages')
const pre = document.querySelector('#messages .message')

const state = {}
const charts = {}     // key -> { values, canvas, valueEl, color, max }
const HISTORY = 120
const CHART_W = 240
const CHART_H = 32

/**
 * @param {string} key
 * @param value
 * @param {string} [color] CSS color
 */
export function setDiagnostic(key, value, color) {
  state[key] = { value, color }
  renderText()
}

/**
 * Push a value into a rolling sparkline plot. Auto-creates the chart on first call.
 * @param {string} key
 * @param {number} value
 * @param {string} [color]
 */
export function chartDiagnostic(key, value, color) {
  if (!charts[key]) initChart(key)
  const c = charts[key]
  c.values.push(value)
  if (c.values.length > HISTORY) c.values.shift()
  if (color) c.color = color
  renderChart(key)
}

function renderText() {
  if (!pre) return
  const keys = Object.keys(state)
  if (keys.length === 0) { pre.textContent = ''; return }
  const longest = Math.max(...keys.map(k => k.length))
  pre.replaceChildren(...keys.map(k => {
    const { value, color } = state[k]
    const line = document.createElement('div')
    line.textContent = `${k.padEnd(longest)}  ${format(value)}`
    if (color) line.style.color = color
    return line
  }))
}

function initChart(key) {
  if (!container) return
  const row = document.createElement('div')
  row.style.cssText = `display:flex;align-items:center;gap:8px;font-family:monospace;font-size:11px;margin-top:2px;`

  const label = document.createElement('span')
  label.textContent = key
  label.style.cssText = `min-width:140px;color:#aaa;`

  const canvas = document.createElement('canvas')
  canvas.width = CHART_W
  canvas.height = CHART_H
  canvas.style.cssText = `width:${CHART_W}px;height:${CHART_H}px;background:rgba(255,255,255,0.04);border-radius:2px;`

  const valueEl = document.createElement('span')
  valueEl.style.cssText = `min-width:60px;text-align:right;color:#ccc;`

  row.append(label, canvas, valueEl)
  container.appendChild(row)

  charts[key] = { values: [], canvas, valueEl, color: '#7e7', max: 1 }
}

function renderChart(key) {
  const c = charts[key]
  if (!c.canvas) return
  const ctx = c.canvas.getContext('2d')
  ctx.clearRect(0, 0, CHART_W, CHART_H)

  const last = c.values[c.values.length - 1]
  c.valueEl.textContent = format(last)
  c.valueEl.style.color = c.color

  if (c.values.length < 2) return
  // soft auto-scaling: max grows fast, decays slowly so spikes stay visible
  const localMax = Math.max(...c.values, 1)
  c.max = Math.max(localMax, c.max * 0.98)

  ctx.strokeStyle = c.color
  ctx.lineWidth = 1.5
  ctx.beginPath()
  c.values.forEach((v, i) => {
    const x = (i / (HISTORY - 1)) * CHART_W
    const y = CHART_H - (v / c.max) * (CHART_H - 2) - 1
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
}

function format(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2)
  if (Array.isArray(v)) return JSON.stringify(v)
  return String(v)
}
