import {chartDiagnostic, setDiagnostic} from "../ui/messages.js"

// A "canary" interval that wants to fire every TICK_MS. Anything later than that
// is main-thread blocking time — by definition, because the JS event loop wasn't
// available to run it on schedule. Aggregate over WINDOW_MS and report.
const TICK_MS = 30
const WINDOW_MS = 1000
const STALL_THRESHOLD_MS = 20  // anything beyond this counts as a "stall"

let started = false

export function startMainThreadMonitor() {
  if (started) return
  started = true

  let lastTick = performance.now()
  let maxLagMs = 0
  let stallCount = 0

  setInterval(() => {
    const now = performance.now()
    const lag = (now - lastTick) - TICK_MS
    lastTick = now
    if (lag > 0 && lag > maxLagMs) maxLagMs = lag
    if (lag > STALL_THRESHOLD_MS) stallCount++
  }, TICK_MS)

  setInterval(() => {
    const lagColor  = maxLagMs   < 20 ? '#7e7' : maxLagMs   < 60 ? '#ee7' : '#f55'
    const stallColor = stallCount === 0 ? '#7e7' : stallCount < 3 ? '#ee7' : '#f55'
    chartDiagnostic('main max stall ms', maxLagMs, lagColor)
    setDiagnostic('main stalls/1s', stallCount, stallColor)
    maxLagMs = 0
    stallCount = 0
  }, WINDOW_MS)
}
