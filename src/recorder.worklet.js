class Recorder extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'record',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate',
      },
    ];
  }

  constructor({ processorOptions }) {
    super();
    this.sr = 44100;
    this.len = Math.floor(this.sr * 2);
    this.buf = new Float32Array(this.len);
    this.writeIdx = 0;
    this.readIdx = 0;
    this.wasRecording = 0;
    this.coolDownLength = 33;
    this.coolDownCounter = 0;
  }

  clearBuffer() {
    this.buf.fill(0);
    this.writeIdx = 0;
    this.readIdx = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    const recordParam = parameters.record;
    const recValue = recordParam[0];
    let isCurrentlyRecording = recValue >= 0.5;

    let w = this.writeIdx;
    let r = this.readIdx;
    const wasPreviouslyRecording = this.wasRecording;

    // rising edge → start recording
    if (!wasPreviouslyRecording && isCurrentlyRecording && this.coolDownCounter === 0) {
      this.clearBuffer();
      this.port.postMessage({ type: 'msg', msg: `recorder start, recValue: ${recValue}`});
      w = this.writeIdx;
      r = this.readIdx;
    }

    // falling edge → stop recording
    if (wasPreviouslyRecording && !isCurrentlyRecording) {
      this.port.postMessage({ type: 'msg', msg: `recorder stop, recValue: ${recValue}` });
      const copy = new Float32Array(this.buf);
      this.port.postMessage({ type: 'audio', audio: copy }, [copy.buffer]);
      this.coolDownCounter = this.coolDownLength;
    }

    // record samples
    if (isCurrentlyRecording) {
      for (let i = 0; i < input.length; i++) {
        // if (w < this.len) {
          this.buf[w] = input[i];
        // }
        if (++w === this.len) w = 0;
      }
    }

    this.writeIdx = w;
    this.readIdx = r;
    this.wasRecording = isCurrentlyRecording;
    this.coolDownCounter = Math.max(this.coolDownCounter - 1, 0);

    return true;
  }
}

registerProcessor('recorder', Recorder);