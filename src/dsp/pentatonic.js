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
 * Range is specified in semitones (not octaves) so callers can land
 * anywhere between "one octave" (±6) and "one and a half" (±9) without
 * having to re-do the math.
 *
 * Returned rates are deduplicated and sorted ascending, so the unison
 * sits somewhere in the middle of the array. Caller indexes however
 * suits the musical intent — random, cycling, weighted, etc.
 *
 * @param {object} [opts]
 * @param {number} [opts.semitonesDown=7] — how many semitones below root to include
 * @param {number} [opts.semitonesUp=7]   — how many semitones above root to include
 * @param {number[]} [opts.intervals=MINOR_PENTATONIC] — semitone offsets within an octave
 * @returns {number[]}
 */
export function pentatonicRates({
  semitonesDown = 7,
  semitonesUp = 7,
  intervals = MINOR_PENTATONIC,
} = {}) {
  // Scan enough octaves either side to cover the requested range.
  const octaveSpan = Math.floor(Math.max(semitonesDown, semitonesUp) / SEMITONES_PER_OCTAVE) + 1
  const semitones = new Set()
  for (let oct = -octaveSpan; oct <= octaveSpan; oct++) {
    for (const i of intervals) {
      const st = oct * SEMITONES_PER_OCTAVE + i
      if (st >= -semitonesDown && st <= semitonesUp) semitones.add(st)
    }
  }
  return [...semitones]
    .sort((a, b) => a - b)
    .map(st => Math.pow(2, st / SEMITONES_PER_OCTAVE))
}
