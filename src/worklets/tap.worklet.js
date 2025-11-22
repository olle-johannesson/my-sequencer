// Audio in -> (optional passthrough) -> out
// Batches N samples and posts them to the main thread.
class TapNode extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'passthrough', defaultValue: 1, minValue: 0, maxValue: 1 }, // 1=copy in->out
    ];
  }

  constructor({ processorOptions }) {
    super();
    this.blockSize = processorOptions?.blockSize ?? 1024;   // how many samples per message
    this.downsample = Math.max(1, Math.floor(processorOptions?.downsample ?? 1)); // e.g. 3 -> 16 kHz from 48k
    this.buf = new Float32Array(this.blockSize);
    this.w = 0;
  }

  process(inputs, outputs, params) {
    const input  = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (!input || !output) return true;

    const doPass = params.passthrough.length > 1 ? params.passthrough[0] >= .5 : params.passthrough[0] >= .5;

    // pass-through (cheap)
    if (doPass) output.set(input); else output.fill(0);

    for (let i = 0; i < input.length; i += this.downsample) {
      // collect samples into buffer
      this.buf[this.w++] = input[i];
      // post message when full
      if (this.w === this.buf.length) {
        this.port.postMessage({ audio: this.buf }, [this.buf.buffer]);
        this.buf = new Float32Array(this.blockSize);
        this.w = 0;
      }
    }
    return true;
  }
}
registerProcessor('tap-node', TapNode);
