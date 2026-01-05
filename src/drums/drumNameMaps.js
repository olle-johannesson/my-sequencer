export const DRUM_TO_PITCH = Object.freeze({
  kick: 36,
  snare: 38,
  snare2: 40,
  hihatClosed: 42,
  hihatPedal: 44,
  hihatOpen: 46,
  crash: 49,
  ride: 51,
  tomLow: 45,
  tomMid: 47,
  tomHigh: 48
})

export const PITCH_TO_DRUM =
  Object.freeze(
    Object.fromEntries(
      Object.entries(DRUM_TO_PITCH)
        .map(([k, v]) => [v, k])))

