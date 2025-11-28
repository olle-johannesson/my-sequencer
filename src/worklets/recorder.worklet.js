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

  constructor() {
    super();
    this.sr = 44100;
    this.len = Math.floor(this.sr * 2);
    this.buf = new Float32Array(this.len);
    this.writeIdx = 0;
    this.wasRecording = 0;
  }

  clearBuffer() {
    this.buf.fill(0);
    this.writeIdx = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    const recordParam = parameters.record;
    const recValue = recordParam[0];
    let isCurrentlyRecording = recValue >= 0.5;

    let w = this.writeIdx;
    const wasPreviouslyRecording = this.wasRecording;

    // rising edge → start recording
    if (!wasPreviouslyRecording && isCurrentlyRecording) {
      this.clearBuffer();
      w = this.writeIdx;
      this.port.postMessage({ type: 'rec begin' });
    }

    // falling edge → stop recording
    if (wasPreviouslyRecording && !isCurrentlyRecording) {
      const copy = new Float32Array(this.buf);
      this.port.postMessage({ type: 'audio', audio: copy }, [copy.buffer]);
      this.port.postMessage({ type: 'rec end' });
    }

    // record samples
    if (isCurrentlyRecording && w < this.len) {
      for (let i = 0; i < input.length && w < this.len; i++) {
        this.buf[w++] = input[i];
      }
    }

    this.writeIdx = w;
    this.wasRecording = isCurrentlyRecording;
    return true;
  }
}

registerProcessor('recorder', Recorder);