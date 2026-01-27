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
    // Delay line buffer
    this.bufferSize = 16384;
    this.buffer = new Float32Array(this.bufferSize);
    this.writePos = 0;

    // Read head with fractional position
    this.readPos = 0;
    this.initialized = false;
  }

  // Linear interpolation
  readSample(pos) {
    const idx = Math.floor(pos) % this.bufferSize;
    const nextIdx = (idx + 1) % this.bufferSize;
    const frac = pos - Math.floor(pos);
    return this.buffer[idx] * (1 - frac) + this.buffer[nextIdx] * frac;
  }

  process(inputs, outputs, params) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!output) return true;

    const wet = params.wet[0];
    const pitchRatio = params.pitchRatio[0];

    if (!input) {
      output.fill(0);
      return true;
    }

    // Write input
    for (let i = 0; i < input.length; i++) {
      this.buffer[this.writePos] = input[i];
      this.writePos = (this.writePos + 1) % this.bufferSize;
    }

    // Initialize read position behind write position
    if (!this.initialized) {
      this.readPos = (this.writePos - 4096 + this.bufferSize) % this.bufferSize;
      this.initialized = true;
    }

    // Simple pitch shifting by reading at different speed
    for (let i = 0; i < output.length; i++) {
      output[i] = this.readSample(this.readPos) * wet;

      // Advance read position at pitchRatio speed
      this.readPos += pitchRatio;

      // Wrap read position
      if (this.readPos >= this.bufferSize) {
        this.readPos -= this.bufferSize;
      }

      // Don't let read catch up to write
      const distance = (this.writePos - this.readPos + this.bufferSize) % this.bufferSize;
      if (distance < 1024) {
        this.readPos = (this.writePos - 4096 + this.bufferSize) % this.bufferSize;
      }
    }

    return true;
  }
}

registerProcessor("pitchshift", PitchShiftProcessor);
