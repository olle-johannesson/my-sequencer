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

let bars = 0

const TEMP_BASE = 1.0
const TEMP_RANGE = 1.0      // adds up to this much on top of base
const TEMP_HALFBARS = 32    // bars to reach the full range (linear, clamped)

const FX_MAX_CHANCE = 0.5
const FX_HALFBARS = 64      // bars to reach the cap

const REVERT_MAX_CHANCE = 0.4
const REVERT_HALFBARS = 96   // start gentle, peak chance once we've drifted far

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
  return TEMP_BASE + TEMP_RANGE * Math.min(1, bars / TEMP_HALFBARS)
}

export function creepEffectChance() {
  return FX_MAX_CHANCE * Math.min(1, bars / FX_HALFBARS)
}

// Per-bar probability that we abandon the wandering continuation and snap back
// to the original seed. Lets the loop "exhale" after a long drift.
export function creepRevertChance() {
  return REVERT_MAX_CHANCE * Math.min(1, bars / REVERT_HALFBARS)
}

// 0..1 normalized creep — for callers that want to bias their behavior smoothly
// rather than read the raw bar count. Saturates at FX_HALFBARS for consistency
// with the effect knobs.
export function creepIntensity() {
  return Math.min(1, bars / FX_HALFBARS)
}
