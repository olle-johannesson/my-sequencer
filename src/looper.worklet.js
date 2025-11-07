// A simple 2-second circular looper.
// - Press & hold 'record' param => writes mic into a 2s circular buffer.
// - Release => keeps looping playback of that 2s buffer.
// - Next hold => clears/overwrites from the start.

class TwoSecondLooper extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {name: 'record', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }

  constructor(_options) {
    super();
    this.sampleRate_ = sampleRate;                // audio render thread sample rate
    this.len = Math.floor(this.sampleRate_ * 2); // 2 seconds
    this.buf = new Float32Array(this.len);
    this.writeIdx = 0;
    this.readIdx = 0;

    this.wasRecording = 0;  // for edge detection
  }

  clearBuffer() {
    this.buf.fill(0);
    this.writeIdx = 0;
    this.readIdx = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0] && inputs[0][0] ? inputs[0][0] : null; // mono
    const outputL = outputs[0][0];
    const outputR = outputs[0][1];

    // k-rate param => one value per block
    const rec = parameters.record[0];

    // rising edge: start a *fresh* recording (overwrite)
    if (this.wasRecording < 0.5 && rec >= 0.5) {
      this.clearBuffer();
    }
    this.wasRecording = rec;

    const N = outputR.length;
    for (let i = 0; i < N; i++) {
      if (rec >= 0.5 && input) {
        this.buf[this.writeIdx] = input[i];
        this.writeIdx++;
        if (this.writeIdx >= this.len) this.writeIdx = 0;
      } else {
          outputL[i] = this.buf[this.readIdx];
          outputR[i] = this.buf[this.readIdx];
      }
      this.readIdx++;
      if (this.readIdx >= this.len) this.readIdx = 0;
    }

    return true;
  }
}

registerProcessor('two-second-looper', TwoSecondLooper);
