import {DRUM_TO_PITCH} from "../drumNameMaps.js";

export const anAfrobeatLiteSeed = {
  notes: [
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.0,   endTime: 0.08 },
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.375, endTime: 0.455 },
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.625, endTime: 0.705 },

    { pitch: DRUM_TO_PITCH.snare, startTime: 0.25,  endTime: 0.33 },
    { pitch: DRUM_TO_PITCH.snare, startTime: 0.75,  endTime: 0.83 },

    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.0,    endTime: 0.03 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.1667, endTime: 0.1967 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.3333, endTime: 0.3633 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.5,    endTime: 0.53 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.6667, endTime: 0.6967 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.8333, endTime: 0.8633 },
  ],
  totalTime: 1.0,
}
