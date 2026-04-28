import {allPresets, createEffectSwitch} from "./effects/effectSwitch.js";
import {setupMasterBus} from "./audio/masterChain.js";
import {addNewRecordedSample, rescheduleOneOfTheRecordedSamples} from "./patternMutation.js";
import {clearAllSamples, clearSample, samplePattern, samplePatternAge, scheduleSample} from "./patterns/samplePattern.js";
import {getMicrophoneStream} from "./audio/microphoneInput.js";
import {setupRecordingChain} from "./audio/recordingChain.js";
import {loadAudioWorklets, pauseAudioContext, startAudioContext} from "./audio/audioSetup.js";
import {clearAllDrums, drumPattern, initDrumPattern, updateDrumPattern} from "./patterns/drumPattern.js";
import {clearAllEffects, effectPattern, updateEffectPattern} from "./patterns/effectPattern.js";
import {creepEffectChance, creepIntensity, resetCreep} from "./patterns/creep.js";
import {setDiagnostic} from "./ui/messages.js";
import {startMainThreadMonitor} from "./dev/mainThreadMonitor.js";
import {startLoop, stopLoop} from "./looper.js";
import {cancelAllScheduled} from "./audio/samplePlayer.js";
import {attachEventListenersToAudioToggle, resetIsRecording, showIsRecording, showLoader} from "./ui/audioToggle.js";
import {spectrumSize} from "./config.js";

const effectKeys = Object.keys(allPresets)
startMainThreadMonitor()


let audioContext, microphoneStream, effectSwitch, /*drumSamples,*/ recordingChain, masterBus, hideLoader

async function start() {
  hideLoader = showLoader()

  if (audioContext) {
    await audioContext.resume()
    microphoneStream = await getMicrophoneStream(microphoneStream)
    const newMicNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream: microphoneStream})
    newMicNode.connect(recordingChain.tap)
    recordingChain.microphoneInputNode = newMicNode
  } else {
    audioContext = await startAudioContext()
    setDiagnostic('outputLatency ms', audioContext.outputLatency * 1000)
    setDiagnostic('baseLatency ms', audioContext.baseLatency * 1000)
    setDiagnostic('sampleRate', audioContext.sampleRate)
    await loadAudioWorklets(audioContext);

    [microphoneStream, effectSwitch, masterBus] = await Promise.all([
      getMicrophoneStream(microphoneStream),
      createEffectSwitch(audioContext),
      setupMasterBus(audioContext, spectrumSize)
    ]);

    recordingChain = await setupRecordingChain(
      audioContext,
      microphoneStream,
      {
        onRecordStart: showIsRecording,
        onRecordStop: resetIsRecording
      })

    // setupEffectButtons(audioContext, masterBus.in, masterBus.out)
    // createPresetTuner(effectSwitch, audioContext, masterBus.in, masterBus.out)
  }

  await initDrumPattern(audioContext)

  startLoop(
    audioContext,
    masterBus.in,
    samplePattern,
    drumPattern,
    effectPattern,
    {
      beforeEachCycle: barNumber => {
        if (barNumber % 2 === 0) {
          updateDrumPattern(audioContext)
        }

        if (Math.random() < creepEffectChance()) {
          updateEffectPattern(effectKeys, creepIntensity())
        }

        if (samplePatternAge > 1) {
          rescheduleOneOfTheRecordedSamples(scheduleSample, clearSample)
        }
      },
      onEffectChange: (newFx, _oldFx, time) => {
        if (newFx) {
          const def = typeof newFx === 'string' ? allPresets[newFx] : newFx
          if (def) effectSwitch.activate(def.chain, def.preset, time, masterBus.in, masterBus.out)
        } else {
          effectSwitch.deactivate(time)
        }
      },
    })

  recordingChain.startRecordingSamples(
    newRecordedSample => {
      addNewRecordedSample(newRecordedSample, scheduleSample, clearSample)
      resetCreep()
    })
  hideLoader()
}

async function stop() {
  stopLoop()
  cancelAllScheduled()
  if (recordingChain?.microphoneInputNode) {
    try { recordingChain.microphoneInputNode.disconnect() } catch {}
  }
  if (microphoneStream) {
    microphoneStream.getAudioTracks().forEach(t => t.stop());
    microphoneStream = null
  }
  await pauseAudioContext(audioContext)
  clearAllSamples()
  clearAllDrums()
  clearAllEffects()
  hideLoader()
}

attachEventListenersToAudioToggle(start, stop)
