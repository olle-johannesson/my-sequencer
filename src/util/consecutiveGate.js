/**
 * This is a bit like a bucket but switching between two states.
 * It's useful for hysteresis, like a gate that opens and closes slowly.
 * We want to make sure something is true for a while before opening the gate
 * and then make sure it's false for a while before closing it again.
 * Small dips in the input sequence don't cause the gate to jitter between states.
 *
 * It's useful to pass the conditions with the update function to allow them
 * to be updated dynamically.
 * @param enterLimit {number}
 * @param exitLimit {number}
 * @returns {function(boolean, boolean): number}
 */
export function createConsecutiveGate(enterLimit, exitLimit) {
  let state = 0;
  let aboveCount = 0;
  let belowCount = 0;

  return function update(enterCond, exitCond) {

    // Consecutive counters
    // Now, at a framerate of 44100 and a post of a few hundred samples per frame,
    // the state would have to hold for like a million years before breaking JavaScripts
    // Number.MAX_SAFE_INTEGER on a modern computer.
    // Nonetheless, we'll be nice programmers and clamp the counters.
    aboveCount = enterCond ? Math.min(aboveCount + 1, enterLimit) : 0;
    belowCount = exitCond  ? Math.max(belowCount + 1, exitLimit) : 0;

    // State transitions
    // We generally don't need to do transition tracking here, but to be
    // agnostic about the conditions possibly being both true, we'll play it safe.
    if (state === 0 && aboveCount >= enterLimit) {
      state = 1;
      aboveCount = 0;
      belowCount = 0;
    }

    if (state === 1 && belowCount >= exitLimit) {
      state = 0;
      aboveCount = 0;
      belowCount = 0;
    }

    return state;
  };
}