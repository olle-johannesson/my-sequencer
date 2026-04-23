import {createEffectSwitch} from "./effects/effectSwitch.js";
import {setupEffectButtons} from "./ui/effectsButtons.js";
import {setupMasterBus} from "./audio/masterChain.js";
import {addNewRecordedSample} from "./patternMutation.js";
import {loadRandomDrums} from "./drums/loadRandomDrums.js";
import {clearAllSamples, clearSample, samplePattern, scheduleSample} from "./patterns/samplePattern.js";
import {getMicrophoneStream, pauseMic} from "./audio/microphoneInput.js";
import {setupRecordingChain} from "./audio/recordingChain.js";
import {loadAudioWorklets, pauseAudioContext, startAudioContext} from "./audio/audioSetup.js";
import {clearAllDrums, drumPattern, updateDrumPattern} from "./patterns/drumPattern.js";
import {clearAllEffects} from "./patterns/effectPattern.js";
import {startLoop, stopLoop} from "./looper.js";
import {attachEventListenersToAudioToggle, resetIsRecording, showIsRecording, showLoader} from "./ui/audioToggle.js";
import {spectrumSize} from "./config.js";
import {createPresetTuner} from "./dev/presetTuner.js";

let audioContext, microphoneStream, effectSwitch, drumSamples, recordingChain, masterBus, hideLoader

async function start() {
  hideLoader = showLoader()
  audioContext = await startAudioContext()
  await loadAudioWorklets(audioContext);

  [ microphoneStream, effectSwitch, drumSamples, masterBus ] = await Promise.all([
    getMicrophoneStream(microphoneStream),
    createEffectSwitch(audioContext),
    loadRandomDrums(audioContext),
    setupMasterBus(audioContext, spectrumSize)
  ]);

  recordingChain = await setupRecordingChain(
    audioContext,
    microphoneStream,
    {
      onRecordStart: showIsRecording,
      onRecordStop: resetIsRecording
    })

  await updateDrumPattern(drumSamples)

  startLoop(
    audioContext,
    masterBus.in,
    samplePattern,
    drumPattern,
    // effectsPattern, {
    //   beforeEachCycle: (cycleNumber) => decideWhatToChange(cycleNumber, {
    //     changeEffectPattern,
    //     effectsPattern,
    //     changeDrumPattern,
    //     drumPattern
    //   })
    // }
    )

  setupEffectButtons(audioContext, masterBus.in, masterBus.out)
  createPresetTuner(effectSwitch, audioContext, masterBus.in, masterBus.out)
  recordingChain.startRecordingSamples(
    newRecordedSample => addNewRecordedSample(newRecordedSample, scheduleSample, clearSample))
  hideLoader()
}

async function stop() {
  await pauseAudioContext(audioContext)
  stopLoop()
  microphoneStream = pauseMic(microphoneStream, recordingChain.microphoneInputNode)
  clearAllSamples()
  clearAllDrums()
  clearAllEffects()
  hideLoader()
  // resetUi()
}

attachEventListenersToAudioToggle(start, stop)
