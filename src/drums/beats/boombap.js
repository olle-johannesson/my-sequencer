// Boom-bap / "Impeach the President"-adjacent hip-hop skeleton
import {DRUM_TO_PITCH} from "../drumNameMaps.js";

export const aBoomBapSeed = {
  notes: [
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.0,   endTime: 0.1 },
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.4375,endTime: 0.5375 },
    { pitch: DRUM_TO_PITCH.kick,  startTime: 0.8125,endTime: 0.9125 },

    { pitch: DRUM_TO_PITCH.snare, startTime: 0.25,  endTime: 0.35 },
    { pitch: DRUM_TO_PITCH.snare, startTime: 0.75,  endTime: 0.85 },

    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.0,   endTime: 0.04 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.125, endTime: 0.165 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.25,  endTime: 0.29 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.375, endTime: 0.415 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.5,   endTime: 0.54 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.625, endTime: 0.665 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.75,  endTime: 0.79 },
    { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.875, endTime: 0.915 },
  ],
  totalTime: 1.0,
}
