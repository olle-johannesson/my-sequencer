// "When the Levee Breaks"-adjacent heavy halftime rock seed
import {DRUM_TO_PITCH} from "../drumNameMaps.js";

export const aLeveeAdjacentSeed = {
  notes: [
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.0,   endTime: 0.14 },
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.375, endTime: 0.515 },
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.875, endTime: 0.98 },

    { pitch: DRUM_TO_PITCH.snare, startTime: 0.5,   endTime: 0.66 },

    { pitch: DRUM_TO_PITCH.hihatOpen,   startTime: 0.0,   endTime: 0.1 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.25,  endTime: 0.31 },
    { pitch: DRUM_TO_PITCH.hihatOpen,   startTime: 0.5,   endTime: 0.6 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.75,  endTime: 0.81 },
  ],
  totalTime: 1.0,
}
