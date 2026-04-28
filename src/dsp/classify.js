import {MAGENTA_DRUM_CLASSES} from "../drums/drumNameMaps.js";

const ATTACK_BLOCK = 2048   // power of 2; ~46 ms at 44.1 kHz — first slice for spectral features

export function classify(samples, sampleRate, Meyda) {
  // First-46-ms slice for attack-time spectrum
  const block = padOrTrim(samples, ATTACK_BLOCK)
  const {spectralCentroid, spectralFlatness, amplitudeSpectrum} =
    Meyda.extract(['spectralCentroid', 'spectralFlatness', 'amplitudeSpectrum'], block)

  // Whole-buffer features
  const duration  = samples.length / sampleRate
  const decayTime = decayTo20Pct(samples, sampleRate)
  const lowRatio  = bandEnergyRatio(amplitudeSpectrum, sampleRate, 0,    200)        // sub-200 Hz share
  const highRatio = bandEnergyRatio(amplitudeSpectrum, sampleRate, 5000, sampleRate / 2) // 5 kHz–nyquist share

  switch (true) {
    case lowRatio  > 0.55 && decayTime < 0.25:                return MAGENTA_DRUM_CLASSES.bassy
    case lowRatio  > 0.30 && decayTime < 0.5:                 return MAGENTA_DRUM_CLASSES.rumblyLow
    case lowRatio  > 0.20 && decayTime < 0.5:                 return MAGENTA_DRUM_CLASSES.rumblyMid
    case highRatio > 0.6  && decayTime < 0.10:                return MAGENTA_DRUM_CLASSES.bright
    case highRatio > 0.5  && decayTime > 0.30:                return MAGENTA_DRUM_CLASSES.airy
    case decayTime > 0.6  && spectralFlatness > 0.5:          return MAGENTA_DRUM_CLASSES.cymbalCrash
    case spectralFlatness > 0.55 && spectralCentroid > 1500:  return MAGENTA_DRUM_CLASSES.snappy
    case spectralFlatness > 0.6  && duration < 0.4:           return MAGENTA_DRUM_CLASSES.percussive
    default:                                                  return MAGENTA_DRUM_CLASSES.percussive
  }
}

// Pad with zeros (or trim) to a fixed length so Meyda gets a power-of-2 block.
function padOrTrim(samples, length) {
  if (samples.length === length) return samples
  if (samples.length >  length) return samples.subarray(0, length)
  const padded = new Float32Array(length)
  padded.set(samples)
  return padded
}

// Time from peak to the first sample below 20% of peak. Cymbals/pads → big number,
// clicks/snaps → tiny number.
function decayTo20Pct(samples, sampleRate) {
  let peak = 0, peakIdx = 0
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i])
    if (v > peak) { peak = v; peakIdx = i }
  }
  if (peak === 0) return samples.length / sampleRate
  const target = peak * 0.2
  for (let i = peakIdx; i < samples.length; i++) {
    if (Math.abs(samples[i]) < target) return (i - peakIdx) / sampleRate
  }
  return (samples.length - peakIdx) / sampleRate
}

// Fraction of total spectral energy living in [fLow, fHigh] Hz.
function bandEnergyRatio(spectrum, sampleRate, fLow, fHigh) {
  const binsPerHz = spectrum.length / (sampleRate / 2)
  const lowBin  = Math.max(0,                Math.floor(fLow  * binsPerHz))
  const highBin = Math.min(spectrum.length,  Math.ceil(fHigh * binsPerHz))
  let band = 0, total = 0
  for (let i = 0; i < spectrum.length; i++) {
    const e = spectrum[i] * spectrum[i]
    total += e
    if (i >= lowBin && i < highBin) band += e
  }
  return total > 0 ? band / total : 0
}