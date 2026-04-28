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
    // `sampleRate` is a worklet global — picks up the actual context rate
    // instead of pinning to 44.1 kHz.
    this.len = Math.floor(sampleRate * 2);
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
      // Send ONLY the portion we wrote — `this.buf` is a fixed-size 2-second
      // scratch area; the rest is zeros from a previous fill. Without this slice,
      // every recording would read as 2.0 s long downstream.
      const copy = this.buf.slice(0, w);
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