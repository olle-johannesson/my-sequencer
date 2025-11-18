import Meyda from "meyda"

let previousBlock
let mb
let rmsThreshold = 1e-3

function publishGate(v /* 0..1 */) {
  mb.f32[0] = v                                             // payload first
  Atomics.store(mb.i32, 0, (Atomics.load(mb.i32, 0) + 1) | 0) // then seq
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
