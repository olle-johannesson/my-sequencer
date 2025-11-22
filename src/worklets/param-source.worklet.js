// src/param-source.worklet.js
class ParamSource extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'attackMs', defaultValue: 5 }, { name: 'releaseMs', defaultValue: 30 }];
  }
  constructor({ processorOptions }) {
    super();
    this.mb = {
      f32: new Float32Array(processorOptions.mailboxSAB, 0, 1),
      i32: new Int32Array(processorOptions.mailboxSAB, 4, 1),
    }
    this.seq = -1;
    this.target = 0;
    this.value = 0;
  }
  process(inputs, outputs, params) {
    const output = outputs[0][0];
    const s = Atomics.load(this.mb.i32, 0);

    if (s !== this.seq) {
      this.value = this.mb.f32[0];
      this.seq = s;
      // this.port.postMessage(`v: ${this.mb.f32[0]}, s: ${s}, seq: ${this.seq}`);
    }

    for (let i= 0; i < output.length ; i++) {
      output[i] = this.value
    }
    return true;
  }
}
registerProcessor('param-source', ParamSource);
