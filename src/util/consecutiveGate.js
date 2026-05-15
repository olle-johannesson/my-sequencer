/**
 * This is a bit like a bucket but switching between two states.
 * It's useful for hysteresis, like a gate that opens and closes slowly.
 * We want to make sure something is true for a while before opening the gate
 * and then make sure it's false for a while before closing it again.
 * Small dips in the input sequence don't cause the gate to jitter between states.
 *
 * The two limits passed at construction time act as defaults. Pass values for
 * `enterLimitOverride` / `exitLimitOverride` to update() to adapt the gate
 * shape per frame (used by analysis.worker to give sustained takes a more
 * forgiving release than percussive ones).
 *
 * @param enterLimit {number}
 * @param exitLimit {number}
 * @returns {function(boolean, boolean, number=, number=): number}
 */
export function createConsecutiveGate(enterLimit, exitLimit) {
  let state = 0;
  let aboveCount = 0;
  let belowCount = 0;

  return function update(enterCond, exitCond, enterLimitOverride, exitLimitOverride) {
    const eLimit = enterLimitOverride ?? enterLimit;
    const xLimit = exitLimitOverride ?? exitLimit;

    // Consecutive counters — clamp at the limit (Math.min) so the count
    // can't run away into Number.MAX_SAFE_INTEGER on a long-lived gate.
    aboveCount = enterCond ? Math.min(aboveCount + 1, eLimit) : 0;
    belowCount = exitCond  ? Math.min(belowCount + 1, xLimit) : 0;

    // State transitions
    // We generally don't need to do transition tracking here, but to be
    // agnostic about the conditions possibly being both true, we'll play it safe.
    if (state === 0 && aboveCount >= eLimit) {
      state = 1;
      aboveCount = 0;
      belowCount = 0;
    }

    if (state === 1 && belowCount >= xLimit) {
      state = 0;
      aboveCount = 0;
      belowCount = 0;
    }

    return state;
  };
}