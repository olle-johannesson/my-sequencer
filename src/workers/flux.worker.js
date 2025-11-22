import Meyda from "meyda"

let previousBlock
let mb
let rmsThreshold = 1e-3

/**
 * It is important to write the value to mailbox before incrementing the sequence counter.
 * Otherwise, the value may be read by the main thread before the sequence counter is incremented.
 * The sequence counter is used like a flag to indicate that the mailbox has been updated.
 * That's why the consumer reads it like this:
 *
 *    if (s !== this.seq) {
 *       this.value = this.mb.f32[0];
 *       this.seq = s;
 *     }
 * @param v
 */
function publishGate(v /* 0..1 */) {
  mb.f32[0] = v
  Atomics.store(mb.i32, 0, (Atomics.load(mb.i32, 0) + 1) | 0)
}

onmessage = async (e) => {
  const {data} = e
  switch (data?.type) {
    case 'init': {
      mb = {
        f32: new Float32Array(data.mailboxSAB, 0, 1),
        i32: new Int32Array(data.mailboxSAB, 4, 1),
      }

      self.postMessage({type: 'ack'})
      break
    }

    case ('data'): {
      const block = data.audio
      if (!previousBlock) { previousBlock = block }
      let { spectralFlux, rms } = Meyda.extract(["spectralFlux", "rms"], block, previousBlock);
      let isNovel = spectralFlux > 0 && rms > rmsThreshold
      publishGate(Number(isNovel))
      previousBlock = block;
    }
  }
}
