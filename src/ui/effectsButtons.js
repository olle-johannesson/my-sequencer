import {allPresets, createEffectSwitch} from "../effects/effectSwitch.js";
import {fxButtons} from "./uiHandles.js";

/**
 * Wires up all effect buttons to their handlers
 */
export function setupEffectButtons(audioContext, input, output) {
  const fxEngine = createEffectSwitch(audioContext);

  fxButtons().forEach(btn => setupEffectButton(btn, fxEngine, input, output, audioContext));

  return fxEngine;
}

/**
 * Check if button is a repeat button (sample-based repeating)
 */
function isRepeatButton(button) {
  return button.id === 'repeat1' || button.id === 'repeat2';
}

/**
 * Setup repeat buttons - these retrigger samples, not master bus effects
 */
function setupRepeatButton(btn) {
  const subdivision = btn.id === 'repeat1' ? 8 : 16;

  btn.addEventListener('pointerdown', () => {
    // startRepeat(subdivision);
  });

  btn.addEventListener('pointerup', () => {
    // stopRepeat();
  });
}

/**
 * Setup regular effect buttons - these go through the fxEngine
 */
function setupEffectButton(btn, fxEngine, input, output, audioContext) {
  btn.addEventListener('pointerdown', () => {
    try {
      input[isRepeatButton(btn) ? 'connect' : 'disconnect'](output)
      const preset = allPresets[btn.id];
      fxEngine.activate(preset.chain, preset.preset, audioContext.currentTime, input, output);
    } catch {}
  });

  btn.addEventListener('pointerup', () => {
    fxEngine.deactivate();
    input.connect(output);
  });
}
