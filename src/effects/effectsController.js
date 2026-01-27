import {allPresets, createFxEngine} from "./fxEngine.js";
import {startRepeat, stopRepeat} from "../looper.js";

/**
 * Wires up all effect buttons to their handlers
 */
export function setupEffectButtons(audioContext, masterGain, outputAnalyser) {
  const fxEngine = createFxEngine(audioContext);
  const fxButtons = document.getElementById("fx").querySelectorAll("button");

  fxButtons.forEach(btn => {
    if (isRepeatButton(btn.id)) {
      setupRepeatButton(btn);
    } else {
      setupEffectButton(btn, fxEngine, masterGain, outputAnalyser, audioContext);
    }
  });

  return fxEngine;
}

/**
 * Check if button is a repeat button (sample-based repeating)
 */
function isRepeatButton(buttonId) {
  return buttonId === 'repeat1' || buttonId === 'repeat2';
}

/**
 * Setup repeat buttons - these retrigger samples, not master bus effects
 */
function setupRepeatButton(btn) {
  const subdivision = btn.id === 'repeat1' ? 8 : 16;

  btn.addEventListener('pointerdown', () => {
    startRepeat(subdivision);
  });

  btn.addEventListener('pointerup', () => {
    stopRepeat();
  });
}

/**
 * Setup regular effect buttons - these go through the fxEngine
 */
function setupEffectButton(btn, fxEngine, masterGain, outputAnalyser, audioContext) {
  btn.addEventListener('pointerdown', () => {
    masterGain.disconnect(outputAnalyser);
    const preset = allPresets[btn.id];
    fxEngine.activate(preset.chain, preset.preset, audioContext.currentTime, masterGain, outputAnalyser);
  });

  btn.addEventListener('pointerup', () => {
    fxEngine.deactivate();
    masterGain.connect(outputAnalyser);
  });
}
