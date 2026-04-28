/**
 * Creates the master output chain
 */
export function setupMasterBus(audioContext, spectrumSize) {
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.25;

  const glueComp = audioContext.createDynamicsCompressor();
  glueComp.threshold.value = -20;
  glueComp.knee.value = 8;
  glueComp.ratio.value = 6;
  glueComp.attack.value = 0.004;
  glueComp.release.value = 0.25;

  const limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;

  const outputAnalyser = audioContext.createAnalyser();
  outputAnalyser.fftSize = spectrumSize * 2;

  masterGain
    .connect(glueComp)
    .connect(limiter)
    .connect(outputAnalyser)
    .connect(audioContext.destination);

  return {
    in: masterGain,
    out: outputAnalyser
  };
}
