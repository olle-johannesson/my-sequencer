// =============================================================================
// Control sliders — wires the two range inputs in the Controls panel to the
// audio engine.
// =============================================================================
//
//  - Input sensitivity → analysis-worker recording threshold multiplier.
//    Driven by setSensitivity (in audio/recordingChain.js).
//
//  - Filter amount → multiplies creep-driven effect chance + intensity in the
//    main loop's beforeEachCycle. Read by getFilterAmount(). 0 disables effect
//    pattern updates entirely; values >1 push effects more aggressive than the
//    creep alone would.
//
// Slider state is read on 'input' (live drag) so changes apply immediately
// without waiting for the user to release.
// =============================================================================

import {setSensitivity} from '../audio/recordingChain.js'

let filterAmount = 1.0

export const getFilterAmount = () => filterAmount

export function setupSliders() {
  const sens = document.getElementById('sensisitivity-gauge')
  if (sens) {
    setSensitivity(parseFloat(sens.value) || 0.5)
    sens.addEventListener('input', () => {
      setSensitivity(parseFloat(sens.value) || 0.5)
    })
  }

  const fil = document.getElementById('filter-gauge')
  if (fil) {
    filterAmount = parseFloat(fil.value) || 1.0
    fil.addEventListener('input', () => {
      filterAmount = parseFloat(fil.value) || 1.0
    })
  }
}
