// Half-time shuffle inspired by the "Rosanna" family of grooves.
// Not the exact pattern — just the same neighborhood:
// kick support, backbeat on 3, ghosted snare motion, triplet-ish lilt.
import {DRUM_TO_PITCH} from "../drumNameMaps.js";

export const aRosannaAdjacentSeed = {
  notes: [
    // kick framework
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.0,   endTime: 0.12 },
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.375, endTime: 0.5 },
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.6875,endTime: 0.8125 },

    // main snare backbeat
    { pitch: DRUM_TO_PITCH.snare, startTime: 0.5,   endTime: 0.62 },

    // ghost notes around the backbeat
    { pitch: DRUM_TO_PITCH.snare, startTime: 0.21875, endTime: 0.28125 },
    { pitch: DRUM_TO_PITCH.snare, startTime: 0.46875, endTime: 0.5 },
    { pitch: DRUM_TO_PITCH.snare, startTime: 0.59375, endTime: 0.65625 },

    // shuffle pulse on hats
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.0,    endTime: 0.06 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.1667, endTime: 0.2267 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.3333, endTime: 0.3933 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.5,    endTime: 0.56 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.6667, endTime: 0.7267 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.8333, endTime: 0.8933 },
  ],
  totalTime: 1.0,
}
