// Basic funk / "Funky Drummer"-adjacent seed
import {DRUM_TO_PITCH} from "../drumNameMaps.js";

export const aFunkyDrummerAdjacentSeed = {
  notes: [
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.0,   endTime: 0.1 },
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.375, endTime: 0.475 },
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.75,  endTime: 0.85 },

    { pitch: DRUM_TO_PITCH.snare, startTime: 0.25,  endTime: 0.35 },
    { pitch: DRUM_TO_PITCH.snare, startTime: 0.5,   endTime: 0.6 },
    { pitch: DRUM_TO_PITCH.snare, startTime: 0.6875,endTime: 0.75 }, // ghost

    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.0,   endTime: 0.05 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.125, endTime: 0.175 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.25,  endTime: 0.3 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.375, endTime: 0.425 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.5,   endTime: 0.55 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.625, endTime: 0.675 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.75,  endTime: 0.8 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.875, endTime: 0.925 },
  ],
  totalTime: 1.0,
}
