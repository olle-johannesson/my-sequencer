/**
 * Creates a multi-band meter that animates CSS and SVG blob
 */
export function createPeakMeter(outputAnalyser) {
  const frequencyBuffer = new Uint8Array(outputAnalyser.frequencyBinCount);
  let blobPath = null;

  // Define frequency bands (in Hz)
  const bands = [
    { name: 'sub', min: 20, max: 80 },      // Sub bass
    { name: 'bass', min: 80, max: 250 },    // Bass
    { name: 'low-mid', min: 250, max: 600 }, // Low mids
    { name: 'mid', min: 600, max: 2500 },   // Mids
    { name: 'high', min: 2500, max: 8000 }, // Highs
  ];

  // Smoothing for blob animation
  let smoothedLevels = bands.map(() => 0);
  const smoothing = 0.3;

  // Generate default circle path
  function getDefaultCirclePath() {
    const cx = 150;
    const cy = 150;
    const radius = 70;
    const numPoints = 60;
    const path = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      if (i === 0) {
        path.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
      } else {
        path.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
    }

    path.push('Z');
    return path.join(' ');
  }

  // Convert Hz to bin index
  function hzToBin(hz) {
    const nyquist = outputAnalyser.context.sampleRate / 2;
    return Math.round((hz / nyquist) * outputAnalyser.frequencyBinCount);
  }

  function getBandLevel(minHz, maxHz) {
    const minBin = hzToBin(minHz);
    const maxBin = hzToBin(maxHz);
    let sum = 0;
    let count = 0;

    for (let i = minBin; i <= maxBin && i < frequencyBuffer.length; i++) {
      sum += frequencyBuffer[i];
      count++;
    }

    return count > 0 ? sum / count / 255 : 0; // Normalize to 0-1
  }

  // Generate blob path from frequency bands
  function generateBlobPath(levels) {
    const cx = 150; // Center X
    const cy = 150; // Center Y
    const baseRadius = 70;
    const numBands = levels.length;
    const path = [];

    // Helper to get interpolated level between two bands
    function getRadiusAtAngle(normalizedAngle) {
      const bandFloat = normalizedAngle * numBands;
      const band1 = Math.floor(bandFloat) % numBands;
      const band2 = (band1 + 1) % numBands;
      const t = bandFloat - Math.floor(bandFloat);

      const level1 = levels[band1];
      const level2 = levels[band2];
      const level = level1 * (1 - t) + level2 * t;

      return baseRadius + level * 10;
    }

    // Create smooth blob with many interpolated points
    const numPoints = 60; // Lots of points for smooth shape

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
      const normalizedAngle = i / numPoints;

      const radius = getRadiusAtAngle(normalizedAngle);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      if (i === 0) {
        path.push(`M ${x} ${y}`);
      } else {
        path.push(`L ${x} ${y}`);
      }
    }

    path.push('Z'); // Close path
    return path.join(' ');
  }

  let frameCount = 0;

  function resetSmoothing() {
    smoothedLevels = bands.map(() => 0);
  }

  function updateMeter() {
    // Only update if audio context is running
    if (outputAnalyser.context.state !== 'running') {
      // When not running, reset smoothing so it starts fresh on resume
      resetSmoothing();
      requestAnimationFrame(updateMeter);
      return;
    }

    outputAnalyser.getByteFrequencyData(frequencyBuffer);

    // Always re-query blob path element to ensure fresh reference
    blobPath = document.getElementById('blob-path');
    if (!blobPath && frameCount % 60 === 0) {
      console.log('WARNING: blob-path element not found!');
    }

    // Get levels for all bands and smooth them
    const levels = bands.map((band, i) => {
      const currentLevel = getBandLevel(band.min, band.max);
      smoothedLevels[i] = smoothedLevels[i] * (1 - smoothing) + currentLevel * smoothing;
      return smoothedLevels[i];
    });

    // Update blob path
    if (blobPath) {
      const pathData = generateBlobPath(levels);

      // Force DOM update by removing and re-adding attribute
      blobPath.removeAttribute('d');
      blobPath.setAttribute('d', pathData);
    } else if (frameCount % 60 === 0) {
      console.log('Blob path element is NULL');
    }

    frameCount++;

    // Update CSS custom properties (for backward compatibility)
    bands.forEach((band, i) => {
      const scaled = levels[i] * 0.01;
      document.documentElement.style.setProperty(`--band-${band.name}`, scaled);
    });

    requestAnimationFrame(updateMeter);
  }

  return updateMeter;
}
