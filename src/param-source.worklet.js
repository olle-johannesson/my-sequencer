// src/param-source.worklet.js
class ParamSource extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'attackMs', defaultValue: 5 }, { name: 'releaseMs', defaultValue: 30 }];
  }
  constructor({ processorOptions:o }) {
    super();
    const sab = o.mailboxSAB;
    this.mb = {
      f32: new Float32Array(sab, 0, 1),
      i32: new Int32Array(sab, 4, 1),
    };
    this.seq = -1; this.target = 0; this.value = 0;
  }
  process(inputs, outputs, params) {
    const out = outputs[0][0];
    // latest-wins mailbox
    const s = Atomics.load(this.mb.i32, 0);
    if (s !== this.seq) { this.target = this.mb.f32[0]; this.seq = s; }
    // smooth
    const attA = Math.exp(-1/(Math.max(1, params.attackMs[0])/1000*sampleRate));
    const relA = Math.exp(-1/(Math.max(1, params.releaseMs[0])/1000*sampleRate));
    for (let i=0;i<out.length;i++){
      const a = this.target > this.value ? attA : relA;
      this.value = this.value*a + (1-a)*this.target;
      out[i] = this.value; // audio-rate control
    }
    return true;
  }
}
registerProcessor('param-source', ParamSource);
