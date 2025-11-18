// in looper.worklet.js

class Looper extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'record', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'a-rate' }, // <-- a-rate now
    ];
  }
  constructor() {
    super();
    this.sr = sampleRate;
    this.len = Math.floor(this.sr);
    this.buf = new Float32Array(this.len);
    this.writeIdx = 0;
    this.readIdx = 0;
    this.wasRecording = 0;           // last sample's state
  }
  clearBuffer() {
    this.buf.fill(0);
    this.writeIdx = 0;
    this.readIdx = 0;
  }


  process(inputs, outputs, parameters) {
    const input  = inputs[0]?.[0];
    const output = outputs[0][0];
    const recArr = parameters.record;
    const N = output.length;

    let w = this.writeIdx;
    let r = this.readIdx;
    let prev = this.wasRecording;

    for (let i = 0; i < N; i++) {
      const rec = (recArr.length > 1 ? recArr[i] : recArr[0]) >= 0.5 ? 1 : 0;

      // rising edge → fresh take
      if (!prev && rec) {
        this.clearBuffer();
        w = this.writeIdx; r = this.readIdx;
      }

      // lowering edge -> classify
      if ( prev && !rec) {
        this.port.postMessage({ type: 'msg', msg: 'looper stopping recording' });
      }
      prev = rec;

      // record if on
      if (rec && input) {
        this.buf[w] = input[i];
        if (++w === this.len) w = 0;
      }

      // always play loop
      output[i] = this.buf[r];
      if (++r === this.len) r = 0;
    }

    this.writeIdx = w;
    this.readIdx = r;
    this.wasRecording = prev;
    return true;
  }
}
registerProcessor('looper', Looper);