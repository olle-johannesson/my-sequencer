import {Kawaii} from "../kits/Kawaii.js";
import {SDS5} from "../kits/SDS5.js";
import {CR78} from "../kits/CR78.js";
import {LINN9000} from "../kits/LINN9000.js";
import {TR808} from "../kits/TR-808.js";
import {TR909} from "../kits/TR-909.js";
import {Drumulator} from "../kits/Drumulator.js";
import {R8} from "../kits/R8.js";
import {RY30} from "../kits/RY30.js";
import {SK1} from "../kits/SK1.js";
import {Korg01W} from "../kits/Korg01W.js";
import {DRUM_TO_PITCH} from "../drumNameMaps.js";
import {KRmini} from "../kits/KRmini.js";
import {HR16b} from "../kits/HR16b.js";
import {VL1} from "../kits/VL1.js";

const note = (pitch, startTime, duration) => ({pitch: DRUM_TO_PITCH[pitch], startTime, endTime: startTime + duration})
const k = t => note('kick', t, 0.10)
const s = t => note('snare', t, 0.10)
const cl = t => note('snare2', t, 0.07)
const hc = t => note('hihatClosed', t, 0.03)
const ho = t => note('hihatOpen', t, 0.07)
const hp = t => note('hihatPedal', t, 0.07)
const rd = t => note('ride', t, 0.05)
const cr = t => note('crash', t, 0.20)
const tl = t => note('tomLow', t, 0.10)
const tm = t => note('tomMid', t, 0.10)
const th = t => note('tomHigh', t, 0.10)

// Custom groove templates.
// Dilla/Questlove: Drag the 2 and 4 late, push the "and" early.
const drunkenSwing = [0, 0.09, -0.02, 0.12, 0, 0.09, -0.02, 0.12, 0, 0.09, -0.02, 0.12, 0, 0.09, -0.02, 0.12];
// Classic MPC 60% swing: Heavy lilt on the 16ths.
const mpcSwing = [0, 0.14, 0, 0.18, 0, 0.14, 0, 0.18, 0, 0.14, 0, 0.18, 0, 0.14, 0, 0.18];

const R8Sidestick = {
  ...R8,
  drums: {
    ...R8.drums,
    snare: () => import('../samples/R8/sidestick.wav?url'),
  },
}

/**
 *
 * @param {function[][]} p
 */
let interpretPattern = p => p.flatMap((drums, sixteenth) => drums.map(f => f(sixteenth / 16)))

export const funkySeedPresets = [
  {
    name: 'RY30 tool',
    kit: RY30,
    bpm: 84,
    seed: {
      notes: interpretPattern([
        [k,ho],[k, hc],[hc],[k,ho],
        [s,hc],[hc],[k,ho],[k, hc],
        [hc],[k,hc],[k,ho],[hc],
        [s,hc],[hc],[ho],[hc],
      ]),
      totalTime: 1.0,
    },
  },


  {
    name: 'CR78 In The Air',
    kit: CR78,
    bpm: 48,
    seed: {
      notes: interpretPattern([
        [tl, hc], [], [tl, hc], [],
        [k, hc], [tl, ho], [hc], [k, ho],
        [k,tl, hc], [k, hc], [k,tl], [k],
        [k, hc], [k,tl, ho], [k, hc], [ho],
      ]),
      totalTime: 1.0,
    },
  },

  {
    name: 'SDS Mutant Garage',
    kit: SDS5,
    bpm: 98,
    swing: mpcSwing,
    seed: {
      notes: interpretPattern([
        [k],[ho],[hc],[],
        [cl],[],[ho],[hc],
        [k],[],[hc],[ho],
        [hc],[],[s,ho],[cl],
      ]),
      totalTime: 1.0,
    },
  },

  {
    name: 'Kawaii Broken Toy Funk',
    kit: Kawaii,
    bpm: 110,
    swing: drunkenSwing,
    seed: {
      notes: interpretPattern([
        [k],[hc],[th,rd],[hc],
        [s],[th],[rd],[k, rd],
        [hc],[],[rd],[hc],
        [th],[cr],[rd],[ho],
      ]),
      totalTime: 1.0,
    },
  },

  {
    name: '808 Billie Jean Pocket',
    kit: TR808,
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
    name: 'Drumulator Purdie Ghost',
    kit: Drumulator,
    bpm: 94,
    swing: mpcSwing,
    seed: {
      notes: interpretPattern([
        [k], [], [], [],
        [s], [], [], [],
        [], [], [k], [],
        [s], [], [ho], [],
      ]),

      totalTime: 1.0,
    },
  },

  {
    name: 'R8 BW',
    kit: R8,
    bpm: 115,
    swing: [
      0,0.10,0,0,0.10,
      0,0.10,0,0,0.10,
      0,0.10,0,0,0.10,
      0,0.10,0,0,0.10,
    ],
    seed: {
      notes: interpretPattern([
        [k,hc],[hp],[hc],[hp],
        [s, hc, rd],[hp],[hc],[hp],
        [hc],[hp],[k,hc,rd],[hp,rd],
        [s, hc],[hp],[k, hc, ho],[hp],
      ]),
      totalTime: 1.0,
    },
  },

  {
    name: 'Sour Times',
    kit: KRmini,
    bpm: 88,
    swing: mpcSwing,
    seed: {
      notes: interpretPattern([
        [k, hc], [hp], [k, hc], [hp],
        [cl, hc], [hp], [hc], [cl,hp],
        [hc], [hp], [k,hc], [k,hp],
        [cl, hc], [hp], [hc], [hp],
      ]),
      totalTime: 1.0,
    },
  },

  {
    name: '808 Waterfalls',
    kit: Korg01W,
    bpm: 92,
    swing: [
      0, 0.2, 0, 0.25,
      0, 0.2, 0, 0.25,
      0, 0.2, 0, 0.25,
      0, 0.2, 0, 0.25,
    ],
    seed: {
      notes: interpretPattern([
        [k,hc],[],[hc],[],
        [s, hc],[],[],[th],
        [hc,th],[k],[k,hc, tm],[k],
        [s,hc],[],[cl,hc],[cl],
      ]),
      totalTime: 1.0,
    },
  },

  {
    name: 'SK-1 Amen',
    kit: SK1,
    bpm: 132,
    // swing: drunkenSwing,
    seed: {
      notes: interpretPattern([
        [k,hc],[],[k,hc],[hc],
        [s,hc],[],[ho,hc],[s],
        [hc],[s],[k,hc],[k],
        [s,hc],[ho],[hc],[s],
      ]),
      totalTime: 1.0,
    },
  },

  {
    name: '909 Four On The Floor',
    kit: TR909,
    bpm: 124,
    seed: {
      notes: [
        k(0.00), k(0.25), k(0.50), k(0.75),
        cl(0.25), cl(0.75),
        hc(0.0000), ho(0.1250), hc(0.2500), ho(0.3750),
        hc(0.5000), ho(0.6250), hc(0.7500), ho(0.8750),
      ],
      totalTime: 1.0,
    },
  },

  {
    // Hand of Doom verse — the spooky jazz comp Bill Ward plays under
    // Geezer's bass. Sparse kick on 1, sidestick "click" on 2 and 4, ride
    // cymbal "spang-a-lang" with strong swing so the "e"s land on the
    // triplet (faking a 12/8 feel inside our 16-step grid). Snare slot is
    // overridden to the R8 sidestick so every snare magenta generates
    // comes back as a click.
    name: 'Hand of Doom',
    kit: R8Sidestick,
    bpm: 92,
    swing: [

    ],
    seed: {
      notes: interpretPattern([
        [k,hc],[],[k],[],
        [s,hp],[],[],[],
        [hc],[s],[k],[k],
        [s,hp],[k],[],[s],
      ]),
      totalTime: 1.0,
    },
  },

  {
    name: 'Sissy Strut',
    kit: RY30,
    bpm: 92,
    swing: [
      0, 0.2, 0, 0.2,
      0, 0.2, 0, 0.2,
      0, 0.2, 0, 0.2,
      0, 0.2, 0, 0.2,
    ],
    seed: {
      notes: interpretPattern([
        [k,hc],[hc],[hc],[k],
        [s],[],[],[ho],
        [k,hc],[k,hc],[hc],[k],
        [s,ho],[],[s,ho],[ho],
      ]),
      totalTime: 1.0,
    },
  },


  {
    name: 'Inner City Life',
    kit: HR16b,
    bpm: 170,
    seed: {
      notes: interpretPattern([
        [k, hc], [], [k, hc], [],
        [s,hc], [rd], [hc], [s],
        [hc], [s], [k,hc], [],
        [hc], [s], [k,hc, tl], [],
      ]),
      totalTime: 1.0,
    },
  },
  {
    name: 'Simplicity',
    kit: VL1,
    bpm: 92,
    seed: {
      notes: interpretPattern([
        [k],[],[hc],[],
        [s],[],[hc],[],
        [],[],[k],[],
        [s],[cl],[hc],[],
      ]),
      totalTime: 1.0,
    },
  },
]