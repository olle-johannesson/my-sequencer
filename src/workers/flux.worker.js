import Meyda from "meyda"
import {createMailboxViews} from "../util/mailbox.js";

let previousBlock
let mb
let rmsThreshold = 1e-3

function isNovel(flux, rms) {
  return (rms > rmsThreshold) && (flux > 0.05);
}

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
onmessage = async (e) => {
  const {data} = e
  switch (data?.type) {
    case 'init': {
      mb = createMailboxViews(data.mailboxSAB)
      self.postMessage({type: 'ack'})
      break
    }

    case ('data'): {
      const block = data.audio
      if (!previousBlock) { previousBlock = block }
      let {
        spectralFlux,
        rms,
        spectralCentroid,
        spectralFlatness
      } = Meyda.extract([
        'spectralFlux',
        'rms',
        'spectralCentroid',
        'spectralFlatness'],
        block,
        previousBlock
      );

      mb.f32[0] = isNovel(spectralFlux, rms);
      mb.f32[1] = rms || 0;
      mb.f32[2] = spectralCentroid || 0;
      mb.f32[3] = spectralFlatness || 0;
      const nextSeq = (Atomics.load(mb.i32, 0) + 1) | 0

      Atomics.store(mb.i32, 0, nextSeq)
      previousBlock = block;
      break;
    }
  }
}
