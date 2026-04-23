import {createBitcrushChain, presets as bitcrushPresets} from "./bitcrushChain.js";
import {createDelayChain, presets as delayPresets} from "./delayChain.js";
import {createFilterDriveChain, presets as filterDrivePresets} from "./filterDriveChain.js";
import {createGateChain, presets as gatePresets} from "./gateChain.js";
import {createGrainChain, presets as grainPresets} from "./grainChain.js";
import {createReverbChain, presets as reverbPresets} from "./reverbChain.js";
import {createPitchChain, presets as pitchPresets} from "./pitchChain.js";
import {bpm} from "../looper.js";
import {thunk} from "../util/thunk.js";
import {createRepeat, presets as repeatPresets} from "./repeat.js";

export const allPresets = {
  crunch: { chain: 'bitcrush', preset: bitcrushPresets.crunch },
  lofi: { chain: 'bitcrush', preset: bitcrushPresets.lofi },
  meltdown: { chain: 'bitcrush', preset: bitcrushPresets.meltdown },
  dub: { chain: 'delay', preset: delayPresets.dub },
  slapback: { chain: 'delay', preset: delayPresets.slapback },
  distort: { chain: 'filterDrive', preset: filterDrivePresets.distort },
  lpWobble: { chain: 'filterDrive', preset: filterDrivePresets.lpWobble },
  bandDrift: { chain: 'filterDrive', preset: filterDrivePresets.bandDrift },
  stutter16: { chain: 'gate', preset: () => gatePresets.stutter16(bpm) },
  tripletish: { chain: 'gate', preset: () => gatePresets.tripletish(bpm) },
  reverse: { chain: 'grain', preset: () => grainPresets.reverse(bpm) },
  semitoneUp: { chain: 'pitch', preset: pitchPresets.semitoneUp },
  semitoneDown: { chain: 'pitch', preset: pitchPresets.semitoneDown },
  vibrato: { chain: 'delay', preset: delayPresets.semitoneUp },
  medium: { chain: 'reverb', preset: reverbPresets.medium },
  small: { chain: 'reverb', preset: reverbPresets.small },
  repeat1: { chain: 'repeat', preset: repeatPresets.middle },
  repeat2: { chain: 'repeat', preset: repeatPresets.fast }
}

/**
 * Creates an audio effect chain and switches the audio path between them when one is 'activated'
 *
 * @param audioCtx
 * @return {{activate: activate, deactivate: deactivate}}
 */
export function createEffectSwitch(audioCtx) {
  const chains = {
    bitcrush: createBitcrushChain(audioCtx),
    delay: createDelayChain(audioCtx),
    filterDrive: createFilterDriveChain(audioCtx),
    gate: createGateChain(audioCtx),
    grain: createGrainChain(audioCtx),
    pitch: createPitchChain(audioCtx),
    reverb: createReverbChain(audioCtx),
    repeat: createRepeat()
  }
  let active = null;

  function activate(chain, config, startTime, inputNode, outputNode) {
    const _config = {
      ...thunk(config), ...{
        t: startTime || audioCtx.currentTime,
        in: inputNode,
        out: outputNode
      }}

    switch(true) {
      case active && active === chain: {
        chains[active].connect(_config);
        break
      }
      case active && active !== chain: {
        chains[active].disconnect(audioCtx.currentTime);
        chains[chain].connect(_config);
        active = chain;
        break;
      }
      case !active: {
        chains[chain].connect(_config);
        active = chain;
        break
      }
    }
  }

  function deactivate(endTime) {
    const t = endTime ?? audioCtx.currentTime;
    if (active) {
      chains[active].disconnect(t);
    }
    active = null;
  }

  return {activate, deactivate};
}
