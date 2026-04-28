// Runs magenta's drum_kit_rnn off the main thread. Receives continueSequence
// requests and posts results back. Lazy-initializes on first request so the
// model load doesn't block startup.

// Tone.js (a magenta peer dep) checks `window` at import time. Workers don't
// have `window` so we alias it to the worker's globalThis before the import.
// Adding `document` defensively too — some libs probe for it.
globalThis.window = globalThis
globalThis.document = globalThis.document || {
  createElement: () => ({ getContext: () => null }),
  createElementNS: () => ({ getContext: () => null }),
}

const drumUrl = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn'

let rnn = null
let initPromise = null

async function ensureInit() {
  if (rnn) return
  if (initPromise) return initPromise
  initPromise = (async () => {
    const m = await import('@magenta/music')
    const r = new m.MusicRNN(drumUrl)
    await r.initialize()
    rnn = r
  })()
  return initPromise
}

self.onmessage = async (e) => {
  const { id, type, seed, temperature, numberOfSteps } = e.data || {}
  try {
    await ensureInit()
    if (type === 'continueSequence') {
      const result = await rnn.continueSequence(seed, numberOfSteps, temperature)
      // Plain-objectify so the structured clone has only what the looper needs.
      const sequence = {
        notes: result.notes.map(n => ({
          pitch: n.pitch,
          quantizedStartStep: n.quantizedStartStep,
          quantizedEndStep: n.quantizedEndStep,
          startTime: n.startTime,
          endTime: n.endTime,
          velocity: n.velocity,
        })),
        totalQuantizedSteps: result.totalQuantizedSteps,
        quantizationInfo: result.quantizationInfo
          ? { stepsPerQuarter: result.quantizationInfo.stepsPerQuarter }
          : undefined,
      }
      self.postMessage({ id, type: 'result', sequence })
    } else if (type === 'init') {
      self.postMessage({ id, type: 'ready' })
    }
  } catch (err) {
    self.postMessage({ id, type: 'error', error: err?.message || String(err) })
  }
}
