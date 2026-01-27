// Simplified pitch shifter using time-domain granular synthesis
class PitchShiftProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "wet", defaultValue: 1.0, minValue: 0.0, maxValue: 1.0, automationRate: "k-rate" },
      { name: "pitchRatio", defaultValue: 1.0, minValue: 0.5, maxValue: 2.0, automationRate: "k-rate" },
    ];
  }

  constructor() {
    super();
    // Delay line buffer per channel
    this.bufferSize = 16384;
    this.buffers = [
      new Float32Array(this.bufferSize),
      new Float32Array(this.bufferSize)
    ];
    this.writePos = [0, 0];
    this.readPos = [0, 0];
    this.initialized = [false, false];
  }

  // Linear interpolation
  readSample(buffer, pos) {
    const idx = Math.floor(pos) % this.bufferSize;
    const nextIdx = (idx + 1) % this.bufferSize;
    const frac = pos - Math.floor(pos);
    return buffer[idx] * (1 - frac) + buffer[nextIdx] * frac;
  }

  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || !output[0]) return true;

    const wet = params.wet[0];
    const pitchRatio = params.pitchRatio[0];

    if (!input || !input[0]) {
      for (let ch = 0; ch < output.length; ch++) {
        output[ch].fill(0);
      }
      return true;
    }

    // Process each channel
    for (let ch = 0; ch < output.length; ch++) {
      const inCh = input[ch] || input[0];  // Fallback to channel 0 if mono
      const outCh = output[ch];
      const buffer = this.buffers[ch];

      // Write input
      for (let i = 0; i < inCh.length; i++) {
        buffer[this.writePos[ch]] = inCh[i];
        this.writePos[ch] = (this.writePos[ch] + 1) % this.bufferSize;
      }

      // Initialize read position behind write position
      if (!this.initialized[ch]) {
        this.readPos[ch] = (this.writePos[ch] - 4096 + this.bufferSize) % this.bufferSize;
        this.initialized[ch] = true;
      }

      // Simple pitch shifting by reading at different speed
      for (let i = 0; i < outCh.length; i++) {
        outCh[i] = this.readSample(buffer, this.readPos[ch]) * wet;

        // Advance read position at pitchRatio speed
        this.readPos[ch] += pitchRatio;

        // Wrap read position
        if (this.readPos[ch] >= this.bufferSize) {
          this.readPos[ch] -= this.bufferSize;
        }

        // Don't let read catch up to write
        const distance = (this.writePos[ch] - this.readPos[ch] + this.bufferSize) % this.bufferSize;
        if (distance < 1024) {
          this.readPos[ch] = (this.writePos[ch] - 4096 + this.bufferSize) % this.bufferSize;
        }
      }
    }

    return true;
  }
}

registerProcessor("pitchshift", PitchShiftProcessor);
