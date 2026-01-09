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

    // ring buffer (~0.75s @ 44.1k)
    this.ringSize = 1 << 15; // 32768
    this.ring = new Float32Array(this.ringSize);
    this.wptr = 0;

    // grain state
    this.grainStart = 0;
    this.grainLen = 2048;
    this.playhead = 0;

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
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!output) return true;

    if (!input) {
      output.fill(0);
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

    // write input into ring
    for (let i = 0; i < input.length; i++) {
      this.ring[this.wptr] = input[i];
      this.wptr = (this.wptr + 1) & (this.ringSize - 1);
    }

    // generate wet output
    for (let i = 0; i < output.length; i++) {
      // retrigger grain when countdown expires
      if (this.countdown-- <= 0) {
        this.countdown = repeatSamp;

        const jitterSamp = Math.floor(
          (jitterMs / 1000) * sampleRate * (this._rand01() * 2 - 1)
        );

        // loop recent audio: start a window behind the write head
        // when picking grainStart on retrigger:
        const base = (this.wptr - this.grainLen + jitterSamp) & (this.ringSize - 1);
        this.grainStart = reverse
          ? (base + (this.grainLen - 1)) & (this.ringSize - 1)   // start at end so reverse walks backward through window
          : base;

        // coherent loop
        this.playhead = 0;
      }

      const pos = this.playhead;
      this.playhead++;
      if (this.playhead >= this.grainLen) this.playhead = 0;

      const readIndex = reverse
        ? (this.grainStart - pos) & (this.ringSize - 1)
        : (this.grainStart + pos) & (this.ringSize - 1);

      const w = this._triWindow(pos, this.grainLen);
      output[i] = this.ring[readIndex] * w * wet;
    }

    return true;
  }
}

registerProcessor("grain-player", GrainPlayerProcessor);