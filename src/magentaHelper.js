import {chartDiagnostic} from "./ui/messages.js"

const worker = new Worker(new URL('./workers/magenta.worker.js', import.meta.url), { type: 'module' })

const pending = new Map()
let nextId = 0

worker.addEventListener('message', (e) => {
  const { id, type, sequence, error } = e.data || {}
  const resolver = pending.get(id)
  if (!resolver) return
  pending.delete(id)
  if (type === 'error') resolver.reject(new Error(error))
  else resolver.resolve(sequence)
})
worker.addEventListener('error', (e) => console.error('magenta worker error', e))

function call(message) {
  return new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    worker.postMessage({ ...message, id })
  })
}

/**
 * @param seed {INoteSequence}
 * @param temperature {number}
 * @returns {Promise<INoteSequence>}
 */
export async function continuePattern(seed, temperature = 1.2) {
  // continueSequence in the worker needs an already-quantized sequence.
  // quantizeSeed runs synchronously here in main; the heavy inference runs
  // in the worker.
  const quantized = seed?.totalQuantizedSteps !== undefined ? seed : quantizeSeed(seed)
  const t0 = performance.now()
  const result = await call({
    type: 'continueSequence',
    seed: quantized,
    numberOfSteps: quantized.totalQuantizedSteps,
    temperature,
  })
  const dt = performance.now() - t0
  const color = dt < 30 ? '#7e7' : dt < 100 ? '#ee7' : '#f55'
  chartDiagnostic('ML beat generation ms', dt, color)
  return result
}

/**
 * Quantize a seed onto a 16-steps-per-bar grid without running the RNN.
 * Bypasses magenta's tempo-dependent quantization, which treats startTime as
 * seconds at the default 120 BPM and would otherwise squash the bar.
 * @param seed {INoteSequence}
 * @returns {INoteSequence}
 */
export function quantizeSeed(seed) {
  return {
    ...seed,
    notes: seed.notes.map(n => ({
      ...n,
      quantizedStartStep: Math.round(n.startTime * 16) % 16,
      quantizedEndStep: Math.round(n.endTime * 16),
    })),
    quantizationInfo: { stepsPerQuarter: 4 },
    totalQuantizedSteps: 16,
  }
}
