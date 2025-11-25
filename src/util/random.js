export const boxMullerTransform = () => Math.sqrt(-2 * Math.log(Math.random())) * Math.cos((2 * Math.PI) * Math.random())
export const getNormallyDistributedNumber = (mean, stddev) => boxMullerTransform() * stddev + mean
