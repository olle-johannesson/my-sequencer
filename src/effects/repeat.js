export const presets = {
  fast: {
    subdivision: 2
  },
  middle: {
    subdivision: 4
  }
}

export let repeatState = {
  active: false,
  subdivision: 2
};

/**
 * Start repeating scheduled samples at a given subdivision
 * @param subdivision {number} - BPM subdivision (8 = 32nd notes, 16 = 16th, 2 = 8th, 1 = quarter)
 */
export function startRepeat(subdivision) {
  repeatState.active = true;
  repeatState.subdivision = subdivision;
}

/**
 * Stop repeating
 */
export function stopRepeat() {
  repeatState.active = false;
}

export function createRepeat() {
  return {
    connect: config => startRepeat(config.subdivision),
    disconnect: stopRepeat
  }
}
