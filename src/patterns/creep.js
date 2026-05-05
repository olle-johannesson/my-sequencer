// =============================================================================
// "Creep" — the longer nothing fundamentally changes, the wilder the loop gets.
// =============================================================================
//
// Tracks bars since the last reset and exposes derived knobs:
//
//   - creepTemperature():  magenta sampling temperature for pattern continuation.
//                          1.0 (musical) at rest; ramps to ~2.0 over ~32 bars.
//   - creepEffectChance(): per-bar probability that the effect pattern mutates.
//                          0% at rest; ramps to 50% over ~64 bars.
//
// resetCreep() is called from "fresh start" events: a new preset is picked,
// or the user does something deliberate (recording a sample, etc.).
//
// Numbers below are starting points. Tune to taste.
// =============================================================================

import {chartDiagnostic} from "../ui/messages.js"
import {creepConfig} from "../config.js"

let bars = 0

export function tickCreep() {
  const aggressiveness = 1 + Math.random() * 0.01
  bars = ++bars ** aggressiveness
  chartDiagnostic('inactivity creep', bars, '#aaa')
}

export function resetCreep() {
  bars = 0
}

export function creepBars() {
  return bars
}

export function creepTemperature() {
  return creepConfig.tempBase + creepConfig.tempRange * Math.min(1, bars / creepConfig.tempHalfBars)
}

export function creepEffectChance() {
  return creepConfig.fxMaxChance * Math.min(1, bars / creepConfig.fxHalfBars)
}

// Per-bar probability that we abandon the wandering continuation and snap back
// to the original seed. Lets the loop "exhale" after a long drift.
export function creepRevertChance() {
  return creepConfig.revertMaxChance * Math.min(1, bars / creepConfig.revertHalfBars)
}

// 0..1 normalized creep — for callers that want to bias their behavior smoothly
// rather than read the raw bar count. Saturates at fxHalfBars for consistency
// with the effect knobs.
export function creepIntensity() {
  return Math.min(1, bars / creepConfig.fxHalfBars)
}
