// Each capture grows by 1-second chunks. The first chunk is pre-allocated;
// further chunks are pushed on demand from inside `process()` — at most once
// per second of sustained recording, so allocation churn on the audio thread
// is minimal. Replaces a fixed 2-second buffer that silently truncated long
// takes the moment they crossed the cap.
const CHUNK_SECONDS = 1;

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
    this.chunkLen = Math.floor(sampleRate * CHUNK_SECONDS);
    this.chunks = [new Float32Array(this.chunkLen)];
    this.writeIdx = 0;
    this.wasRecording = 0;
  }

  resetCapture() {
    // Drop any growth from the previous take; reuse the first chunk.
    this.chunks.length = 1;
    this.writeIdx = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    const isCurrentlyRecording = parameters.record[0] >= 0.5;
    const wasPreviouslyRecording = this.wasRecording;

    // rising edge → start recording
    if (!wasPreviouslyRecording && isCurrentlyRecording) {
      this.resetCapture();
      this.port.postMessage({ type: 'rec begin' });
    }

    // falling edge → flatten chunks into one buffer and ship it
    if (wasPreviouslyRecording && !isCurrentlyRecording) {
      const fullChunks = this.chunks.length - 1;
      const totalLen = fullChunks * this.chunkLen + this.writeIdx;
      const copy = new Float32Array(totalLen);
      for (let i = 0; i < fullChunks; i++) {
        copy.set(this.chunks[i], i * this.chunkLen);
      }
      copy.set(
        this.chunks[fullChunks].subarray(0, this.writeIdx),
        fullChunks * this.chunkLen
      );
      this.port.postMessage({ type: 'audio', audio: copy }, [copy.buffer]);
      this.port.postMessage({ type: 'rec end' });
    }

    // record samples
    if (isCurrentlyRecording) {
      let cur = this.chunks[this.chunks.length - 1];
      let w = this.writeIdx;
      for (let i = 0; i < input.length; i++) {
        if (w >= this.chunkLen) {
          cur = new Float32Array(this.chunkLen);
          this.chunks.push(cur);
          w = 0;
        }
        cur[w++] = input[i];
      }
      this.writeIdx = w;
    }

    this.wasRecording = isCurrentlyRecording;
    return true;
  }
}

registerProcessor('recorder', Recorder);
