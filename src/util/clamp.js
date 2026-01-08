/**
 * Clamp a number between a min and a max
 *
 * @param value {number}
 * @param min {number}
 * @param max {number}
 * @return {number}
 */
export const clamp = (value, min, max) => Math.max(min, Math.min(value, max))
