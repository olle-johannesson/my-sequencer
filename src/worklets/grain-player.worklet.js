class GrainPlayerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "wet",      defaultValue: 0.0,  minValue: 0.0, maxValue: 1.0,  automationRate: "k-rate" },
      { name: "windowMs", defaultValue: 40.0, minValue: 5.0, maxValue: 200.0, automationRate: "k-rate" },
      { name: "repeatMs", defaultValue: 80.0, minValue: 5.0, maxValue: 2000.0, automationRate: "k-rate" },
      { name: "jitterMs", defaultValue: 0.0,  minValue: 0.0, maxValue: 50.0, automationRate: "k-rate" },
      { name: "reverse",  defaultValue: 0.0,  minValue: 0.0, maxValue: 1.0,  automationRate: "k-rate" },
    ];
  }

  constructor() {
    super();

    // ring buffer (~0.75s @ 44.1k) per channel
    this.ringSize = 1 << 15; // 32768
    this.rings = [
      new Float32Array(this.ringSize),
      new Float32Array(this.ringSize)
    ];
    this.wptr = [0, 0];

    // grain state per channel
    this.grainStart = [0, 0];
    this.grainLen = 2048;
    this.playhead = [0, 0];

    // retrigger phase accumulator
    this.phase = 0;

    // rng
    this.seed = 1337;

    this.countdown = 0;
  }

  _rand01() {
    // simple xorshift
    let x = this.seed | 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x;
    return ((x >>> 0) / 4294967295);
  }

  _triWindow(pos, len) {
    // triangle window 0..1..0 (cheap and click-safe)
    const x = pos / len;              // 0..1
    const w = 1 - Math.abs(x * 2 - 1);
    return w;
  }

  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || !output[0]) return true;

    if (!input || !input[0]) {
      for (let ch = 0; ch < output.length; ch++) {
        output[ch].fill(0);
      }
      return true;
    }

    const wet = params.wet[0];
    const windowMs = params.windowMs[0];
    const repeatMs = params.repeatMs[0];
    const jitterMs = params.jitterMs[0];
    const reverse = params.reverse[0] >= 0.5;

    // compute grain length in samples
    this.grainLen = Math.max(8, Math.floor((windowMs / 1000) * sampleRate));

    // compute retrigger interval in samples
    const repeatSamp = Math.max(1, Math.floor((repeatMs / 1000) * sampleRate));

    // Process each channel
    for (let ch = 0; ch < output.length; ch++) {
      const inCh = input[ch] || input[0];  // Fallback to channel 0 if mono
      const outCh = output[ch];
      const ring = this.rings[ch];

      // write input into ring
      for (let i = 0; i < inCh.length; i++) {
        ring[this.wptr[ch]] = inCh[i];
        this.wptr[ch] = (this.wptr[ch] + 1) & (this.ringSize - 1);
      }

      // generate wet output
      for (let i = 0; i < outCh.length; i++) {
        // retrigger grain when countdown expires (shared across channels)
        if (ch === 0 && this.countdown-- <= 0) {
          this.countdown = repeatSamp;

          const jitterSamp = Math.floor(
            (jitterMs / 1000) * sampleRate * (this._rand01() * 2 - 1)
          );

          // Set grain start for all channels
          for (let c = 0; c < 2; c++) {
            const base = (this.wptr[c] - this.grainLen + jitterSamp) & (this.ringSize - 1);
            this.grainStart[c] = reverse
              ? (base + (this.grainLen - 1)) & (this.ringSize - 1)
              : base;
            this.playhead[c] = 0;
          }
        }

        const pos = this.playhead[ch];
        this.playhead[ch]++;
        if (this.playhead[ch] >= this.grainLen) this.playhead[ch] = 0;

        const readIndex = reverse
          ? (this.grainStart[ch] - pos) & (this.ringSize - 1)
          : (this.grainStart[ch] + pos) & (this.ringSize - 1);

        const w = this._triWindow(pos, this.grainLen);
        outCh[i] = ring[readIndex] * w * wet;
      }
    }

    return true;
  }
}

registerProcessor("grain-player", GrainPlayerProcessor);