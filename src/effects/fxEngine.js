import {createBitcrushChain, presets as bitcrushPresets} from "./bitcrushChain.js";
import {createDelayChain, presets as delayPresets} from "./delayChain.js";
import {createFilterDriveChain, presets as filterDrivePresets} from "./filterDriveChain.js";
import {createGateChain, presets as gatePresets} from "./gateChain.js";
import {createGrainChain, presets as grainPresets} from "./grainChain.js";
import {createReverbChain, presets as reverbPresets} from "./reverbChain.js";

export const allPresets = {
  crunch: { chain: 'bitcrush', preset: bitcrushPresets.crunch },    // ok
  meltdown: { chain: 'bitcrush', preset: bitcrushPresets.meltdown },  // ok
  dub: { chain: 'delay', preset: delayPresets.dub },        // ok
  slapback: { chain: 'delay', preset: delayPresets.slapback },        // ok
  lpWobble: { chain: 'filterDrive', preset: filterDrivePresets.lpWobble },  // ok ?
  bandDrift: { chain: 'filterDrive', preset: filterDrivePresets.bandDrift },   // ok ?
  stutter8: { chain: 'gate', preset: gatePresets.stutter8 },            //
  stutter16: { chain: 'gate', preset: gatePresets.stutter16 },      //
  driftGate: { chain: 'gate', preset: gatePresets.driftGate },
  bursty: { chain: 'gate', preset: gatePresets.bursty },
  tripletish: { chain: 'gate', preset: gatePresets.tripletish },
  beatRepeat: { chain: 'grain', preset: grainPresets.beatRepeat }, // 14
  glitchStretch: { chain: 'grain', preset: grainPresets.glitchStretch },
  reverseWindow: { chain: 'grain', preset: grainPresets.reverseWindow }, // 17
  vinylJitter: { chain: 'grain', preset: grainPresets.vinylJitter },
  medium: { chain: 'reverb', preset: reverbPresets.medium },
  small: { chain: 'reverb', preset: reverbPresets.small }
}

export function createFxEngine(audioCtx) {
  const chains = {
    bitcrush: createBitcrushChain(audioCtx),
    delay: createDelayChain(audioCtx),
    filterDrive: createFilterDriveChain(audioCtx),
    gate: createGateChain(audioCtx),
    grain: createGrainChain(audioCtx),
    reverb: createReverbChain(audioCtx)
  }
  let active = null;

  function activate(chain, config, startTime, inputNode, outputNode) {
    const _config = {
      ...config,
      t: startTime || config.t || audioCtx.currentTime,
      in: inputNode || config.in,
      out: outputNode || config.out
    }

    if (active && active === chain) {
      return
    }

    if (active && active !== chain) {
      chains[active].disconnect(t);
    }

    chains[chain].connect(_config);
    active = chain;
  }

  function deactivate(endTime) {
    const t = endTime ?? audioCtx.currentTime;
    if (active) chains[active].disconnect(t);
    active = null;
  }

  return {activate, deactivate};
}
