import {loadKawaii} from "../loaders/loadKawaii.js";
import {loadSDS5} from "../loaders/loadSDS5.js";
import {loadCR78} from "../loaders/loadCR78.js";
import {loadLINN9000} from "../loaders/loadLINN9000.js";
import {loadLN2} from "../loaders/loadLN2.js";
import {loadTR808} from "../loaders/loadTR808.js";
import {loadDrumulator} from "../loaders/loadDrumulator.js";
import {loadSP12} from "../loaders/loadSP12.js";
import {loadR8} from "../loaders/loadR8.js";
import {loadRX5} from "../loaders/loadRX5.js";
import {DRUM_TO_PITCH} from "../drumNameMaps.js";

const note = (pitch, startTime, duration) => ({pitch: DRUM_TO_PITCH[pitch], startTime, endTime: startTime + duration})
const k = t => note('kick', t, 0.10)
const s = t => note('snare', t, 0.10)
const cl = t => note('snare2', t, 0.07)
const hc = t => note('hihatClosed', t, 0.03)
const ho = t => note('hihatOpen', t, 0.07)
const rd = t => note('ride', t, 0.05)
const cr = t => note('crash', t, 0.20)
const tl = t => note('tomLow', t, 0.10)
const tm = t => note('tomMid', t, 0.10)
const th = t => note('tomHigh', t, 0.10)

export const funkySeedPresets = [
  {
    name: 'Linn Pocket',
    loadKit: loadLINN9000,
    bpm: 96,
    seed: {
      notes: [
        { pitch: DRUM_TO_PITCH.kick,  startTime: 0.00,  endTime: 0.10 },
        { pitch: DRUM_TO_PITCH.kick,  startTime: 0.375, endTime: 0.475 },
        { pitch: DRUM_TO_PITCH.kick,  startTime: 0.6875,endTime: 0.7875 },

        { pitch: DRUM_TO_PITCH.snare, startTime: 0.25,  endTime: 0.35 },
        { pitch: DRUM_TO_PITCH.snare, startTime: 0.625, endTime: 0.67 },
        { pitch: DRUM_TO_PITCH.snare, startTime: 0.75,  endTime: 0.85 },

        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.00,  endTime: 0.03 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.125, endTime: 0.155 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.25,  endTime: 0.28 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.375, endTime: 0.405 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.50,  endTime: 0.53 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.625, endTime: 0.655 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.75,  endTime: 0.78 },
        { pitch: DRUM_TO_PITCH.hihatOpen,   startTime: 0.875, endTime: 0.94 },
      ],
      totalTime: 1.0,
    },
  },

  {
    name: 'CR78 Tight Machine Funk',
    loadKit: loadCR78,
    bpm: 100,
    seed: {
      notes: [
        { pitch: DRUM_TO_PITCH.kick,  startTime: 0.00, endTime: 0.09 },
        { pitch: DRUM_TO_PITCH.kick,  startTime: 0.50, endTime: 0.59 },

        { pitch: DRUM_TO_PITCH.snare, startTime: 0.25, endTime: 0.34 },
        { pitch: DRUM_TO_PITCH.snare, startTime: 0.75, endTime: 0.84 },

        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.00,  endTime: 0.03 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.125, endTime: 0.155 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.25,  endTime: 0.28 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.375, endTime: 0.405 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.50,  endTime: 0.53 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.625, endTime: 0.655 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.75,  endTime: 0.78 },
        { pitch: DRUM_TO_PITCH.hihatOpen,   startTime: 0.875, endTime: 0.93 },
      ],
      totalTime: 1.0,
    },
  },

  {
    name: 'SDS Broken Funk',
    loadKit: loadSDS5,
    bpm: 104,
    seed: {
      notes: [
        { pitch: DRUM_TO_PITCH.kick,  startTime: 0.00,   endTime: 0.11 },
        { pitch: DRUM_TO_PITCH.kick,  startTime: 0.3125, endTime: 0.4225 },
        { pitch: DRUM_TO_PITCH.kick,  startTime: 0.8125, endTime: 0.9225 },

        { pitch: DRUM_TO_PITCH.snare, startTime: 0.25,   endTime: 0.36 },
        { pitch: DRUM_TO_PITCH.snare, startTime: 0.75,   endTime: 0.86 },

        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.00,   endTime: 0.03 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.1875, endTime: 0.2175 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.375,  endTime: 0.405 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.50,   endTime: 0.53 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.6875, endTime: 0.7175 },
        { pitch: DRUM_TO_PITCH.hihatOpen,   startTime: 0.9375, endTime: 0.99 },
      ],
      totalTime: 1.0,
    },
  },

  {
    name: 'Kawaii Skip Bounce',
    loadKit: loadKawaii,
    bpm: 108,
    seed: {
      notes: [
        { pitch: DRUM_TO_PITCH.kick,  startTime: 0.00,   endTime: 0.08 },
        { pitch: DRUM_TO_PITCH.kick,  startTime: 0.5, endTime: 0.5175 },
        { pitch: DRUM_TO_PITCH.kick,  startTime: 0.6875, endTime: 0.7175 },

        { pitch: DRUM_TO_PITCH.snare, startTime: 0.25,   endTime: 0.33 },
        { pitch: DRUM_TO_PITCH.snare, startTime: 0.75,   endTime: 0.83 },
        { pitch: DRUM_TO_PITCH.snare, startTime: 0.6875,   endTime: 0.7175 },

        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.00,   endTime: 0.03 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.125,  endTime: 0.155 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.3125, endTime: 0.3425 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.50,   endTime: 0.53 },
        { pitch: DRUM_TO_PITCH.hihatClosed, startTime: 0.6875, endTime: 0.7175 },
        { pitch: DRUM_TO_PITCH.hihatOpen,   startTime: 0.875,  endTime: 0.93 },
      ],
      totalTime: 1.0,
    },
  },

  {
    name: '808 Billie Jean Pocket',
    loadKit: loadTR808,
    bpm: 96,
    seed: {
      notes: [
        k(0.0), k(0.25), k(0.5), k(0.75),
        s(0.25), s(0.75),
        cl(0.4375), cl(0.6875),
        hc(0.0), hc(0.125), hc(0.25), hc(0.375),
        hc(0.5), hc(0.625), hc(0.75), hc(0.875),
      ],
      totalTime: 1.0,
    },
  },


  {
    name: 'Drumulator Rosanna Pocket',
    loadKit: loadDrumulator,
    bpm: 86,
    swing: [
      0, 0.2, 0, 0.3,
      0, 0.3, 0, 0.4,
      0, 0.2, 0, 0.3,
      0, 0.3, 0, 0.4,
    ],
    seed: {
      notes: [
        // half-time shuffle: backbeat on 3, ghost snares on the swung &-positions
        k(0.0), k(0.5),
        s(0.5),
        s(0.125), s(0.375), s(0.625),
        hc(0.0), hc(0.125), hc(0.25), hc(0.375),
        hc(0.5), hc(0.625), hc(0.75), hc(0.875),
      ],
      totalTime: 1.0,
    },
  },

  {
    name: 'SP-12 Lust for Life',
    loadKit: loadR8,
    bpm: 104,
    swing: [
      0,0.1,0,0.1,
      0,0.1,0,0.1,
      0,0.1,0,0.1,
      0,0.1,0,0.1,
    ],
    seed: {
      notes: [
        k(0.0), k(0.25), k(0.4375), k(0.5625), k(0.6875), k(0.75), k(0.9375),
        s(0.125), s(0.375),
        s(0.625), s(0.875),
        ho(0.125), ho(0.375),
        ho(0.625), ho(0.875),
        hc(0.0), hc(0.125), hc(0.25), hc(0.375),
        hc(0.5), hc(0.625), hc(0.75), hc(0.875),
      ],
      totalTime: 1.0,
    },
  },

  {
    name: 'R8 Bonham Bombs',
    loadKit: loadR8,
    bpm: 92,
    seed: {
      notes: [
        k(0.0), k(0.125),
        s(0.25),
        k(0.5),
        s(0.75),
        ho(0.0), hc(0.125), ho(0.25), ho(0.375),
        ho(0.5), hc(0.625), ho(0.75), hc(0.875),
      ],
      totalTime: 1.0,
    },
  },

  {
    name: '808 Pocket Strut',
    loadKit: loadTR808,
    bpm: 92,
    seed: {
      notes: [
        k(0.0), k(0.5), k(0.875),
        s(0.25), s(0.75),
        s(0.5625),
        rd(0.5675), cr(0.875),
        cl(0.25), cl(0.75),
        hc(0.0), ho(0.125), hc(0.25), hc(0.375),
        ho(0.625), ho(0.75), ho(0.875),
        ho(0.6875),
      ],
      totalTime: 1.0,
    },
  },





  {
    name: 'R8 12/8 Slow Shuffle',
    loadKit: loadR8,
    bpm: 52,
    swing: [
      0, 0.2, 0, 0.2,
      0, 0.2, 0, 0.2,
      0, 0.2, 0, 0.2,
      0, 0.2, 0, 0.2,
    ],
    seed: {
      notes: [
        k(0.0), k(0.9375),
        cl(0.8125),

        hc(0.125),
        hc(0.375),
        hc(0.625),
        hc(0.8675),

        rd(0.0),  rd(0.125), rd(0.1875),
        rd(0.25), rd(0.375), rd(0.4375),
        rd(0.5),  rd(0.625), rd(0.6875),
        rd(0.75), rd(0.8675), rd(0.9375),
        ho(0.875),
      ],
      totalTime: 1.0,
    },
  },
]
