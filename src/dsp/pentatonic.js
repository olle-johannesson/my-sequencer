// Equal-temperament intervals. A semitone is 2^(1/12) ≈ 1.0595x in frequency.
//
// Pentatonic flavours kept here as named exports. Minor is the default —
// it's the more "everywhere" sound, works over almost any backing, and
// matches the project's general mood. Major can be passed explicitly when
// you want something brighter.
export const MINOR_PENTATONIC = [0, 3, 5, 7, 10]
export const MAJOR_PENTATONIC = [0, 2, 4, 7, 9]

const SEMITONES_PER_OCTAVE = 12

/**
 * Generate playbackRate multipliers spanning a pentatonic scale around a
 * sample's root pitch (whatever the recording's detected pitch happens to be).
 *
 * The root maps to `1.0` — the sample plays at its natural pitch. Other
 * scale tones are equal-temperament ratios: `2^(semitones / 12)`. The
 * detected fundamental in Hz is *not* needed; the rates are purely relative.
 *
 * Returned rates are deduplicated and sorted ascending, so the unison sits
 * somewhere in the middle of the array. Caller indexes however suits the
 * musical intent — random, cycling, weighted, etc.
 *
 * @param {object} [opts]
 * @param {number} [opts.octavesDown=1]
 * @param {number} [opts.octavesUp=1]
 * @param {number[]} [opts.intervals=MINOR_PENTATONIC] — semitone offsets within an octave
 * @returns {number[]}
 */
export function pentatonicRates({
  octavesDown = 1,
  octavesUp = 1,
  intervals = MINOR_PENTATONIC,
} = {}) {
  const semitones = new Set()
  for (let oct = -octavesDown; oct <= octavesUp; oct++) {
    for (const i of intervals) semitones.add(oct * SEMITONES_PER_OCTAVE + i)
  }
  return [...semitones]
    .sort((a, b) => a - b)
    .map(st => Math.pow(2, st / SEMITONES_PER_OCTAVE))
}
