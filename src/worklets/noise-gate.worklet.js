// noise-gate.worklet.js
class NoiseGate extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name:'threshold', defaultValue: -50 }, // dB
      { name:'ratio',     defaultValue: 4 },   // downward expansion
      { name:'mix',       defaultValue: 1 }
    ];
  }

  constructor() {
    super();
    this.env = 0;
    this.alphaAtt = Math.exp(-1/(0.005*sampleRate));
    this.alphaRel = Math.exp(-1/(0.050*sampleRate));
  }

  process(inputs, outputs, params) {
    const input  = inputs[0][0];
    const output = outputs[0][0];
    if (!input) { output.fill(0); return true; }

    const thr = Math.pow(10, params.threshold[0]/20); // dB→linear
    const mix = params.mix[0];
    const ratio = params.ratio[0];

    let env = this.env;

    for (let i=0; i<input.length; i++) {
      const x = input[i];
      const a = Math.abs(x);

      // envelope follower
      const coeff = (a > env) ? this.alphaAtt : this.alphaRel;
      env = coeff*env + (1-coeff)*a;

      // downward expansion
      let g = 1;
      if (env < thr) {
        const below = env / thr;
        g = Math.pow(below, ratio);  // lower volume smoothly
      }

      output[i] = x * (mix*g + (1-mix));
    }

    this.env = env;
    return true;
  }
}
registerProcessor('noise-gate', NoiseGate);
