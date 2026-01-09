class BitcrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bitDepth', defaultValue: 4, minValue: 1, maxValue: 16 },
      { name: 'rateReduction', defaultValue: 0.5, minValue: 0.01, maxValue: 1 }
    ];
  }
  constructor() {
    super();
    this.phase = 0;
    this.last = 0;
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input[0]) return true;

    const inCh = input[0];
    const outCh = output[0];
    const bitDepth = parameters.bitDepth;
    const rateReduction = parameters.rateReduction;

    const step = Math.pow(0.5, bitDepth[0] || 4);

    for (let i = 0; i < inCh.length; i++) {
      this.phase += rateReduction[0] || 0.5;
      if (this.phase >= 1.0) {
        this.phase -= 1.0;
        // quantize amplitude
        this.last = Math.round(inCh[i] / step) * step;
      }
      outCh[i] = this.last;
    }
    return true;
  }
}
registerProcessor('bitcrusher', BitcrusherProcessor);
