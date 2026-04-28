import Meyda from "meyda"
import {findOnset} from "../dsp/findOnset.js";
import {applyEnvelope} from "../dsp/envelope.js";
import {createNoiseSpectrumMailboxViews} from "../util/mailbox.js";
import {createHannWindow} from "../dsp/hannWindow.js";
import {wienerDenoiseBuffer} from "../dsp/wienerFilter.js";
import {classify} from "../dsp/classify.js";

let noiseMailbox, fftSize, hopSize, hannWindow, localNoiseSpectrum, lastNoiseSeq, sampleRate;

function updateHannwindow() {
  if (!hannWindow || hannWindow.length !== fftSize) {
    hannWindow = createHannWindow(fftSize);
  }
}

function updateLocalNoiseSpectrum() {
  if (!noiseMailbox) { return }
  const seq = Atomics.load(noiseMailbox.i32, 0);
  if (seq === lastNoiseSeq) { return }

  lastNoiseSeq = seq;

  const src = noiseMailbox.f32;
  if (!localNoiseSpectrum || localNoiseSpectrum.length !== src.length) {
    localNoiseSpectrum = new Float32Array(src.length);
  }
  localNoiseSpectrum.set(src);
}

self.onmessage = (e) => {
  const { data } = e
  switch (data?.type) {
    case 'init': {
      noiseMailbox = createNoiseSpectrumMailboxViews(data.noiseMailboxSAB, data.spectrumSize / 2);
      fftSize = data.spectrumSize;
      sampleRate = data.sampleRate;
      hopSize = fftSize / 4;
      updateHannwindow()
      self.postMessage({ type: 'ack' });
      break;
    }

    default: {
      const {samples, sampleRate} = e.data;
      const copy = new Float32Array(samples);
      updateLocalNoiseSpectrum()


      // trim to a good onset transient
      const onsetIndex = findOnset(Meyda, copy, sampleRate);
      const tailIndex = copy.length //findTail(float, sampleRate); // or just use float.length
      const trimmedView = copy.subarray(onsetIndex, tailIndex);

      // Hard floor — anything below ~50 ms is glitch territory. Above that
      // we trust the analysis worker's noise-gated recording decision.
      // (The old threshold was 0.5 s, which only worked because the recorder
      // worklet padded every recording to 2 s; that's no longer the case.)
      if (trimmedView.length < sampleRate / 20) {
        console.log(`recording too short (${trimmedView.length} samples), skipping`)
        return
      }
      // de-noise the sample using a wiener filter
      const deNoised = wienerDenoiseBuffer(trimmedView, localNoiseSpectrum, fftSize, hopSize, hannWindow, 8)

      // apply clip-friendly envelope
      const processed = new Float32Array(deNoised.length);
      processed.set(deNoised);
      applyEnvelope(processed, sampleRate);
      const {classification, features, discardedAs} = classify(processed, sampleRate, Meyda)
      if (!classification) {
        console.log(`discarded sample (matched profile: ${discardedAs})`)
        return
      }

      self.postMessage({samples: processed, sampleRate, classification, features}, [processed.buffer]);
    }
  }
};

