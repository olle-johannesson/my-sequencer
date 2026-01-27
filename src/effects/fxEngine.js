import {createBitcrushChain, presets as bitcrushPresets} from "./bitcrushChain.js";
import {createDelayChain, presets as delayPresets} from "./delayChain.js";
import {createFilterDriveChain, presets as filterDrivePresets} from "./filterDriveChain.js";
import {createGateChain, presets as gatePresets} from "./gateChain.js";
import {createGrainChain, presets as grainPresets} from "./grainChain.js";
import {createReverbChain, presets as reverbPresets} from "./reverbChain.js";
import {bpm} from "../looper.js";

export const allPresets = {
  crunch: { chain: 'bitcrush', preset: bitcrushPresets.crunch },
  meltdown: { chain: 'bitcrush', preset: bitcrushPresets.meltdown },
  dub: { chain: 'delay', preset: delayPresets.dub },
  slapback: { chain: 'delay', preset: delayPresets.slapback },
  lpWobble: { chain: 'filterDrive', preset: filterDrivePresets.lpWobble },
  bandDrift: { chain: 'filterDrive', preset: filterDrivePresets.bandDrift },
  stutter16: { chain: 'gate', preset: () => gatePresets.stutter16(bpm) },
  tripletish: { chain: 'gate', preset: () => gatePresets.tripletish(bpm) },
  repeat1: { chain: 'grain', preset: () => grainPresets.repeat1(bpm) },
  repeat2: { chain: 'grain', preset: () => grainPresets.repeat2(bpm) },
  reverse: { chain: 'grain', preset: () => grainPresets.reverse(bpm) },
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
    // If config is a function (BPM-dependent preset), call it to get the actual config
    const resolvedConfig = typeof config === 'function' ? config() : config;

    const _config = {
      ...resolvedConfig,
      t: startTime || resolvedConfig.t || audioCtx.currentTime,
      in: inputNode || resolvedConfig.in,
      out: outputNode || resolvedConfig.out
    }

    if (active && active === chain) {
      return
    }

    if (active && active !== chain) {
      chains[active].disconnect(audioCtx.currentTime);
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
