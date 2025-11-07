// Control node: audio in → gate control out (0..1). No audio passthrough.
// Detects "interesting" events using fast vs slow energy and outputs a held gate.
//
// Params:
//  - sensitivity (dB): how much fast energy must exceed slow baseline
//  - floor (dB): ignore everything below this RMS
//  - holdMs: keep gate high for this long after trigger
//  - cooldownMs: minimum time between triggers
//  - attackMs/releaseMs: smooth the control edge

class OnsetDetector extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'sensitivity', defaultValue: 6,   minValue: 0,  maxValue: 24 }, // dB over baseline
      { name: 'floor',       defaultValue: -60, minValue: -90, maxValue: -6 },// dB RMS floor
      { name: 'holdMs',      defaultValue: 150, minValue: 10, maxValue: 2000 },
      { name: 'cooldownMs',  defaultValue: 80,  minValue: 0,  maxValue: 1000 },
      { name: 'attackMs',    defaultValue: 5,   minValue: 0,  maxValue: 50 },
      { name: 'releaseMs',   defaultValue: 30,  minValue: 0,  maxValue: 500 },
    ];
  }
  constructor() {
    super();
    this.sr = sampleRate;

    // energy trackers (RMS approximations with EMA on squared signal)
    this.eFast = 0;                     // fast energy EMA
    this.eSlow = 0;                     // slow energy EMA
    this.alphaFast = Math.exp(-1/(0.010 * this.sr)); // ~10 ms
    this.alphaSlow = Math.exp(-1/(0.150 * this.sr)); // ~150 ms

    // gate state
    this.gate = 0;                      // smoothed 0..1 control
    this.targetGate = 0;                // hard 0/1 before smoothing
    this.holdSamplesLeft = 0;
    this.cooldownLeft = 0;

    // smoothing
    this.attackA = (ms)=> Math.exp(-1/(Math.max(1,ms)/1000 * this.sr));
    this.releaseA = this.attackA;
    this.aAtt = this.attackA(5);
    this.aRel = this.releaseA(30);
  }

  process(inputs, outputs, parameters) {
    const x = inputs[0]?.[0];                 // mono in (post gate)
    const y = outputs[0][0];                  // control out
    if (!x) { y.fill(0); return true; }

    // read k-rate params once per block
    const sensDb   = parameters.sensitivity[0];
    const floorDb  = parameters.floor[0];
    const holdMs   = parameters.holdMs[0];
    const coolMs   = parameters.cooldownMs[0];
    const attMs    = parameters.attackMs[0];
    const relMs    = parameters.releaseMs[0];

    // update smoothing coefficients lazily if changed notably
    this.aAtt = this.attackA(attMs);
    this.aRel = this.releaseA(relMs);

    const floorLin = Math.pow(10, floorDb/20);
    const sensLin  = Math.pow(10, sensDb/20);

    let eF = this.eFast, eS = this.eSlow;
    let gate = this.gate, target = this.targetGate;
    let hold = this.holdSamplesLeft, cool = this.cooldownLeft;

    const N = y.length;
    for (let i = 0; i < N; i++) {
      const xi = x[i] || 0;
      const r2 = xi*xi;

      // energy trackers (EMA on squared, then sqrt via compare in linear)
      eF = eF * this.alphaFast + (1 - this.alphaFast) * r2;
      eS = eS * this.alphaSlow + (1 - this.alphaSlow) * r2;

      // ignore if below absolute floor
      const rms = Math.sqrt(eF);
      const activeAboveFloor = rms >= floorLin;

      // trigger condition: fast energy exceeds slow baseline by sensitivity
      const trigger = activeAboveFloor && (eF >= eS * (sensLin * sensLin)); // compare squared

      if (cool > 0) cool--;
      if (hold > 0) {
        // while holding, keep target high and count down
        target = 1;
        hold--;
      } else {
        // not holding; maybe start a new hold if trigger and cooldown elapsed
        if (trigger && cool <= 0) {
          target = 1;
          hold = Math.round(holdMs / 1000 * this.sr);
          cool = Math.round(coolMs / 1000 * this.sr);
        } else {
          target = 0;
        }
      }

      // smooth to avoid chatter (attack/release)
      if (target > gate) {
        gate = gate * this.aAtt + (1 - this.aAtt) * 1;
      } else {
        gate = gate * this.aRel + (1 - this.aRel) * 0;
      }

      y[i] = gate; // this is the control signal 0..1
    }

    this.eFast = eF; this.eSlow = eS;
    this.gate = gate; this.targetGate = target;
    this.holdSamplesLeft = hold; this.cooldownLeft = cool;

    return true;
  }
}

registerProcessor('onset-detector', OnsetDetector);
