export function audioBufferFromSAB(audioContext, sab, options = {}) {
  const {
    channels = 1,
    sampleRate = audioContext.sampleRate,
    interleaved = false, // set true if SAB is LRLRLR...
  } = options;

  const sabView = new Float32Array(sab);
  const length = sabView.length / (interleaved ? channels : 1);
  const buffer = audioContext.createBuffer(channels, length, sampleRate);

  if (!interleaved) {
    if (channels === 1) {
      buffer.copyToChannel(sabView, 0);
    } else {
      const samplesPerChannel = length;
      for (let ch = 0; ch < channels; ch++) {
        const start = ch * samplesPerChannel;
        const end = start + samplesPerChannel;
        buffer.copyToChannel(sabView.subarray(start, end), ch);
      }
    }
  } else {
    // Deinterleave LRLRLR... into separate channels
    for (let ch = 0; ch < channels; ch++) {
      const channelData = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        channelData[i] = sabView[i * channels + ch];
      }
    }
  }

  return buffer;
}
