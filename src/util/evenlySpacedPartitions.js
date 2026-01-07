/**
 * Get the fractions of a number given the denominator
 * @param numerator {number}
 * @param denominator {number}
 * @return {number[]}
 */
export function evenlySpacedPartitions(numerator, denominator = 1) {
  return [...new Array(numerator)].map((_a, i) => i * denominator / numerator)
}
