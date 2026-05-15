// =============================================================================
// "Creep" — the longer nothing fundamentally changes, the wilder the loop gets.
// =============================================================================
//
// Tracks bars since the last reset and exposes:
//
//   - creepTemperature():  magenta sampling temperature for pattern continuation.
//                          Climbs from tempBase to tempBase + tempRange over
//                          tempHalfBars worth of bars.
//   - creepRevertChance(): per-bar probability of snapping back to the seed
//                          pattern. Lets the loop exhale after a long drift.
//
// resetCreep() is called from "fresh start" events: a new preset is picked,
// or the user does something deliberate (recording a sample, etc.).
//
// Numbers in config.creepConfig are starting points. Tune to taste.
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

export function creepTemperature() {
  return creepConfig.tempBase + creepConfig.tempRange * Math.min(1, bars / creepConfig.tempHalfBars)
}

export function creepRevertChance() {
  return creepConfig.revertMaxChance * Math.min(1, bars / creepConfig.revertHalfBars)
}
