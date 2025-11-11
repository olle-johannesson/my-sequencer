import Meyda from "meyda"

let previousBlock
let mb

// state for adaptive thresholding and gate timing
let exponentialMovingAverageOfFlux = 0;                     // exponential moving average of flux
const alpha = 0.9;               // EMA smoothing (higher = slower)
const mult = 1.6;                // threshold multiplier (tune 1.3–2.0)
const floorFlux = 0.001;         // ignore tiny flux (noise floor)

let rmsThreshold = 1e-5

let holdLeft = 0;                // frames left to keep gate = 1
let cooldownLeft = 0;            // frames to wait before retrigger

// HOP-TIMED settings (in STFT frames, not ms)
const HOLD_FRAMES = 4;           // ~ (HOLD_MS / hop_ms). e.g., hop 128 @ 48k ≈ 2.67ms → 4 ≈ 11ms
const COOLDOWN_FRAMES = 8;       // prevent rapid retriggers


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
      const block = e.data.audio
      if (block && previousBlock) {
        let flux = Meyda.extract("spectralFlux", block, previousBlock );
        let rms = Meyda.extract("rms", block);
        if (flux > 0 && rms > rmsThreshold) {
          publishGate(1);
        } else {
          publishGate(0);
        }


        // if (flux < floorFlux) flux = 0;
        //
        // // update adaptive baseline
        // exponentialMovingAverageOfFlux = (alpha * exponentialMovingAverageOfFlux + (1 - alpha) * flux) || 0
        // const fluxThreshold = exponentialMovingAverageOfFlux * mult;
        //
        // // frame-based gate logic
        // if (cooldownLeft > 0) cooldownLeft--;
        // if (holdLeft > 0) {
        //   holdLeft--;
        //   publishGate(1);
        // } else if (flux > fluxThreshold && rms > rmsThreshold && cooldownLeft === 0) {
        //   // trigger!
        //   holdLeft = HOLD_FRAMES;
        //   cooldownLeft = COOLDOWN_FRAMES;
        //   publishGate(1);
        // } else {
        //   // self.postMessage({type: 'msg', msg: {flux, fluxThreshold, holdLeft, cooldownLeft}})
        //   publishGate(0);
        // }
      }
      previousBlock = block;
    }
  }
}
