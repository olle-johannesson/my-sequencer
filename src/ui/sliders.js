import {setSensitivity} from '../audio/recordingChain.js'
import {filterGauge, sensitivityGauge} from './uiHandles.js'

let filterAmount = 1.0

export const getFilterAmount = () => filterAmount

export function setupSliders() {
  const sens = sensitivityGauge()
  if (sens) {
    setSensitivity(parseFloat(sens.value) || 0.5)
    sens.addEventListener('input', () => {
      setSensitivity(parseFloat(sens.value) || 0.5)
    })
  }

  const fil = filterGauge()
  if (fil) {
    filterAmount = parseFloat(fil.value) || 1.0
    fil.addEventListener('input', () => {
      filterAmount = parseFloat(fil.value) || 1.0
    })
  }
}
