import Meyda from "meyda"
import { findOnset } from "../dsp/findOnset.js";
import { applyEnvelope } from "../dsp/envelope.js";

self.onmessage = (e) => {
  const { samples, sampleRate } = e.data;
  const copy = new Float32Array(samples);

  // trim to a good onset transient
  const onsetIndex = findOnset(Meyda, copy, sampleRate);
  const tailIndex  = copy.length //findTail(float, sampleRate); // or just use float.length
  const trimmedView = copy.subarray(onsetIndex, tailIndex);

  // apply clip-friendly envelope
  const processed = new Float32Array(trimmedView.length);
  processed.set(trimmedView);
  applyEnvelope(processed, sampleRate);

  self.postMessage({ samples: processed, sampleRate }, [processed.buffer]);
};
