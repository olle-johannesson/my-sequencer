// src/param-source.worklet.js
import {createFeatureMailboxViews} from "../util/mailbox.js";
import {gainFromRms, hpfFreqFromCentroid} from "../dsp/featureConversion.js";

class AnalysisReader extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'attackMs',
      defaultValue: 5
    }, {
      name: 'releaseMs',
      defaultValue: 30
    }];
  }
  constructor({ processorOptions }) {
    super();
    this.mb = createFeatureMailboxViews(processorOptions.mailboxSAB);
    this.lastSeq = -1;
    this.value = 0;
    this.rmsThreshold = processorOptions.rmsThreshold ?? 1e-3
    this.features = {
      novelty: 0,
      rms: 0,
      centroidHz: 0,
      flatness: 0 };
    this.smoothed = {
      gate: 0,
      hpFreq: 100,
      gain: 1
    };
  }

  updateFeaturesIfNeeded() {
    const currentSeq = Atomics.load(this.mb.i32, 0);
    if (currentSeq === this.lastSeq) {
      return;
    }
    this.lastSeq = currentSeq;
    const f = this.mb.f32;

    this.features.novelty = f[0];
    this.features.rms = f[1];
    this.features.centroidHz = f[2];
    this.features.flatness = f[3];
  }

  process(inputs, outputs, params) {
    const [gateOut, hpOut, gainOut] = outputs;
    this.updateFeaturesIfNeeded();

    this.smoothed.gate += 0.1 * ( this.features.novelty - this.smoothed.gate);

    const targetHp = hpfFreqFromCentroid(this.features.centroidHz, { flatness: this.features.flatness })
    this.smoothed.hpFreq += 0.05 * (targetHp - this.smoothed.hpFreq);

    const rawGain = gainFromRms(this.features.rms);
    this.smoothed.gain += 0.05 * (rawGain - this.smoothed.gain);

    const len = gateOut[0].length;
    for (let i = 0; i < len; i++) {
      gateOut[0][i] = this.smoothed.gate;
      hpOut[0][i]   = this.smoothed.hpFreq;
      gainOut[0][i] = this.smoothed.gain;
    }

    return true;
  }
}
registerProcessor('analysis-reader', AnalysisReader);
