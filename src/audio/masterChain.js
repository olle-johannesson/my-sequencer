/**
 * Creates the master output chain
 */
export function setupMasterBus(audioContext, spectrumSize) {
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.25;

  const outputAnalyser = audioContext.createAnalyser();
  outputAnalyser.fftSize = spectrumSize * 2;

  masterGain
    .connect(outputAnalyser)
    .connect(audioContext.destination);

  return {
    in: masterGain,
    out: outputAnalyser
  };
}
