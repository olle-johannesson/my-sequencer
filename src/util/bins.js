/**
 * Finds the index of the bin including the number x.
 * If no bin can be found that contains x, -1 will be returned
 *
 * ex:
 * bins: [1, 2.5, 3, 6.1]
 * x: 6.0
 * returns 2
 *
 * @param {number[]} bins
 * @param {number} x
 * @return {number}
 */
export function binIndex(bins, x) {
  let cumulative = 0
  for (let i = 0; i < bins.length; i++) {
    cumulative += bins[i]
    if (x < cumulative) {
      return i;
    }
  }
  return -1
}
