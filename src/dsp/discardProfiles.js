// =============================================================================
// Discard profiles — feature-shape signatures of recordings we want to throw away.
// =============================================================================
//
// Each profile is a `{ name, match }` pair. `match(features)` returns true if
// the features look like that kind of unwanted sound. We check every profile;
// if any matches, the recording is rejected.
//
// Profiles can use whichever features make sense for them. Missing features
// just compare as `undefined < x` → false in JS, so a profile that needs e.g.
// `lowRatio` will never match at gate-time (where we don't compute it) but will
// match at post-classify time (where we do). One table covers both stages.
//
// To add a new profile: append a `{name, match}` row. To debug: the matching
// profile is logged so you can tune its thresholds against real recordings.
// =============================================================================

export const DISCARD_PROFILES = [
  {
    name: 'hiss',
    description: 'White-noise-like — fan, mic self-noise, electrical hiss.',
    match: ({flatness}) => flatness > 0.7,
  },
  {
    name: 'wind',
    description: 'Sustained low-frequency rumble — wind, breath, body movement.',
    match: ({centroid, flux}) => centroid < 200 && flux < 0.3,
  },
  {
    name: 'sub-only',
    description: 'Bottom-heavy with no high content and no decay — usually rumble that snuck past the gate.',
    match: ({lowRatio, highRatio, decayTime, duration}) =>
      lowRatio > 0.9 && highRatio < 0.03 && (decayTime / duration) > 0.9,
  },
  {
    name: 'flat-pad',
    description: 'Long, no transient, no clear pitch — featureless drones (hum, AC, traffic).',
    // A held *pitched* note has the same envelope shape (duration > 1.5 s,
    // decay covers most of it) but we want to keep it as a sustained-melodic
    // source. Gate the discard on pitchStability so only the truly featureless
    // takes get dropped.
    match: ({duration, decayTime, pitchStability}) =>
      duration > 1.5 && (decayTime / duration) > 0.95 && !(pitchStability > 0.5),
  },
]

/**
 * Returns the first matching profile if the features look like junk, else null.
 * Caller can use null as "keep this" and the matched profile as both a "discard
 * this" signal and (via .name) a debug breadcrumb.
 *
 * @param {object} features  any subset of {rms, flux, flatness, centroid, lowRatio, highRatio, duration, decayTime, ...}
 * @returns {{name: string, description: string} | null}
 */
export function matchDiscardProfile(features) {
  for (const profile of DISCARD_PROFILES) {
    if (profile.match(features)) return profile
  }
  return null
}
