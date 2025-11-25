// using fftjs because it is what Meyda uses, so we don't need two FFT libs in the bundle
import fftjs from 'fftjs'

/**
 * Apply a Wiener filter using a known noise floor for noise suppression.
 *
 * @param input {Float32Array}
 * @param localNoiseSpectrum {Float32Array}
 * @param fftSize {number}
 * @param hopSize {number}
 * @param hannWindow {Float32Array}
 * @param maxSuppressionDb {number} max gain to apply to the frame (default: 8)
 * @returns {Float32Array<ArrayBuffer>}
 */
export function wienerDenoiseBuffer(input, localNoiseSpectrum, fftSize, hopSize, hannWindow, maxSuppressionDb = 8) {
  const N = input.length;
  const out = new Float32Array(N + fftSize); // tail room
  out.fill(0);

  // We'll chop up the input into frames of size fftSize, apply Wiener filter, and add the result to out.
  // This variable will hold the current frame being processed.
  const frame = new Float32Array(fftSize);

  // Sliding-window approach: process input in chunks of size hopSize.
  // The frames will overlap by hopSize/2 samples.
  for (let start = 0; start < N; start += hopSize) {
    const remaining = N - start;
    if (remaining <= 0) break;

    // Zero-out the frame (in case it already has old data in it from a previous frame)
    // and copy the new data into it.
    // This also makes sure that if we're close to the end of the input and there isn't enough data for the entire frame,
    // the frame is padded with zeros.
    frame.fill(0);
    frame.set(input.subarray(start, Math.min(start + fftSize, N)));

    let zeroes = frame.reduce((acc, v) => !v ? acc + 1 : acc, 0);
    // Using a Hann window to fade the frame edges, this reduces clickiness.
    for (let i = 0; i < fftSize; i++) {
      frame[i] *= hannWindow[i];
    }
    // console.log('zeroes', zeroes, 'total', frame.length)
    // De-noise the frame using the local noise spectrum.
    const yFrame = applyWienerToFrame(frame, localNoiseSpectrum, maxSuppressionDb);
    // When we have the result, we have to overlap the frames, just as we
    // overlapped the input when we chopped it up into frames.
    for (let i = 0; i < fftSize; i++) {
      out[start + i] += yFrame[i];
    }
  }

  // trim to the original length
  return out.subarray(0, N);
}

/**
 * Apply Wiener filter to a single FFT frame.
 * @param frame {Float32Array} length fftSize (windowed already)
 * @param localNoiseSpectrum {Float32Array} length fftSize/2 (Meyda amplitudeSpectrum)
 * @param maxSuppressionDb {number} max gain to apply to the frame (default: 8)
 * @returns {Float32Array}
 */
function applyWienerToFrame(frame, localNoiseSpectrum, maxSuppressionDb = 8) {
  if (!localNoiseSpectrum) {
    // no noise model yet → passthrough (clone to be safe)
    return new Float32Array(frame);
  }

  // First, we fft and set some constants
  const phasors = fftjs.fft(frame);
  const real = phasors.real;
  const imag = phasors.imag;
  const bins = real.length;

  // The localNoiseSpectrum is a smoothed amplitudeSpectrum. It is half the size of the fftSize.
  const halfBins = localNoiseSpectrum.length; // = fftSize / 2
  const eps = 1e-8;
  const gainFloor = Math.pow(10, -maxSuppressionDb / 20) || 0.1;

  /**
   * So the idea is to remove the ratio of noise to signal in each bin.
   * Remember that this is in the spectral domain.
   * If there is no noise at all at that frequency, we can pass the signal through,
   * and if it's just noise, we zero-out that frequency.
   * If it's something inbetween, we'll scale the frequency down by the ratio of signal-to-noise.
   */
  for (let k = 0; k < bins; k++) {
    // get the real and imaginary parts of the bin
    // and compute the power of the signal
    const re = real[k];
    const im = imag[k];
    const signalPower = re * re + im * im;

    // FFT is symmetric for real values, so we can mirror the noise spectrum across the center bin.
    const mirrorIdx =
      k < halfBins
        ? k
        : Math.min(bins - k, halfBins - 1);

    // compute the power of the noise
    const noiseMag = localNoiseSpectrum[mirrorIdx] || 0;
    const noisePower = noiseMag * noiseMag;

    // The money shot: compute the signal-to-noise ratio (SNR) of the bin
    // If the signal power and noise power are pretty much the same, we'll end up with an SNR of 0.'
    // That is pretty much just noise, we cannot wash it away.
    // If the signal power is much higher than the noise power, we'll end up with an SNR that tends to infinity.
    const post = Math.max(signalPower - noisePower, 0);
    const snrPost = post / (noisePower + eps);

    // Calculate the gain for this bin based on the SNR (this is the wiener filter).
    // If the SNR is low (just noise), we'll end up with a gain of 0 -> kill the bin.
    // If the SNR is high (useful signal), we'll end up with a gain that's close to 1 -> let the bin pass through.
    // And values inbetween, of course.
    let gain = snrPost / (snrPost + 1);
    if (!Number.isFinite(gain)) { gain = 0; }
    gain = Math.max(gain, gainFloor)

    real[k] = re * gain;
    imag[k] = im * gain;
  }

  // inverse fft to get the time domain signal. However, it seems that fftjs returns a complex array, where
  // the inverse-fft signal is in the real part
  // see https://github.com/nevosegal/fftjs/issues/5
  const timeDomain = fftjs.ifft({ real, imag }).real;
  return Float32Array.from(timeDomain);
}
