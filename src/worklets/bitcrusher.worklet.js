class BitcrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bitDepth', defaultValue: 4, minValue: 1, maxValue: 16 },
      { name: 'rateReduction', defaultValue: 0.5, minValue: 0.01, maxValue: 1 }
    ];
  }
  constructor() {
    super();
    this.phase = [0, 0];  // Separate phase for each channel
    this.last = [0, 0];   // Separate last sample for each channel
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input[0]) return true;

    const bitDepth = parameters.bitDepth;
    const rateReduction = parameters.rateReduction;
    const step = Math.pow(0.5, bitDepth[0] || 4);

    // Process all channels
    for (let ch = 0; ch < output.length; ch++) {
      const inCh = input[ch] || input[0];  // Fallback to channel 0 if mono
      const outCh = output[ch];

      for (let i = 0; i < inCh.length; i++) {
        this.phase[ch] += rateReduction[0] || 0.5;
        if (this.phase[ch] >= 1.0) {
          this.phase[ch] -= 1.0;
          this.last[ch] = Math.round(inCh[i] / step) * step;
        }
        outCh[i] = this.last[ch];
      }
    }
    return true;
  }
}
registerProcessor('bitcrusher', BitcrusherProcessor);
