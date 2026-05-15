import {createEffectSwitch, handleEffectChangeAt} from "./effects/effectSwitch.js";
import {setupMasterBus} from "./audio/masterChain.js";
import {addNewRecordedSample, clearMutationState, maybeReshuffle} from "./patternMutation.js";
import {clearAllSamples, incrementPatternAge, samplePattern, scheduleAt as samplePatternScheduleAt} from "./patterns/samplePattern.js";
import {getMicrophoneStream, setMicDeviceId, swapLiveMicTo} from "./audio/microphoneInput.js";
import {populateInputSources, setupInputSourceSelect} from "./ui/inputSourceSelect.js";
import {audioFeatureSAB, setupRecordingChain} from "./audio/recordingChain.js";
import {setupInputMeter} from "./ui/inputMeter.js";
import {setupSliders} from "./ui/sliders.js";
import {setupKeyboardShortcuts} from "./ui/keyboardShortcuts.js";
import {loadAudioWorklets, pauseAudioContext, startAudioContext} from "./audio/audioSetup.js";
import {clearAllDrums, drumPattern, getCurrentPattern, initDrumPattern, scheduleAt as drumPatternScheduleAt, updateDrumPattern} from "./patterns/drumPattern.js";
import {bassPattern, clearAllBass, initBassPattern, scheduleAt as bassPatternScheduleAt, updateBassPattern} from "./patterns/bassPattern.js";
import {clearAllEffects, effectPattern, maybeMutateOnBar as maybeMutateEffectsOnBar} from "./patterns/effectPattern.js";
import {resetCreep} from "./patterns/creep.js";
import {setDiagnostic} from "./ui/messages.js";
import {startMainThreadMonitor} from "./dev/mainThreadMonitor.js";
import {startLoop, stopLoop} from "./looper.js";
import {cancelAllScheduled} from "./audio/samplePlayer.js";
import {attachEventListenersToAudioToggle, resetIsRecording, showIsRecording, showLoader} from "./ui/audioToggle.js";
import {spectrumSize} from "./config.js";
import {video} from "./ui/uiHandles.js";
import {getVideoUrl} from "./ui/loadvideo.js";
import {setVideoEffect} from "./effects/videoEffects.js";
import {classificationColor, resetSampleSlots, setupMonitoringPanel, showSampleInSlot, surfaceStartError} from "./ui/monitoringPanel.js";

let audioContext, microphoneStream, effectSwitch, recordingChain, masterBus, hideLoader

video().src = getVideoUrl()
video().load();
startMainThreadMonitor()
attachEventListenersToAudioToggle(start, stop)
setupInputMeter(audioFeatureSAB)
setupSliders()
setupKeyboardShortcuts()
setupMonitoringPanel()
setupInputSourceSelect(async (deviceId) => {
  setMicDeviceId(deviceId)
  // Live-swap only makes sense if the audio chain is up.
  if (audioContext && recordingChain) {
    microphoneStream = await swapLiveMicTo(audioContext, microphoneStream, recordingChain, deviceId)
  }
})

async function start() {
  // Three steps:
  // 1. Audio context, worklets, microphone, master bus.
  // 2. Initial drum and bass patterns (magenta seeds the drums; bass seeds from the drums).
  // 3. Start the loop.
  hideLoader = showLoader()

  // 1. Audio context, worklets, microphone, master bus.
  try {
    if (audioContext) {
      // Resuming an existing context. The microphone stream is torn down on
      // every pause (so the browser's mic indicator goes away) and rebuilt
      // here — a small performance hit, worth it for the UX.
      await audioContext.resume()
      microphoneStream = await getMicrophoneStream(microphoneStream)
      const newMicNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream: microphoneStream})
      newMicNode.connect(recordingChain.tap)
      recordingChain.microphoneInputNode = newMicNode
    } else {
      // First start — build the whole graph from scratch.
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

      populateInputSources()
    }

    // 2. Initial patterns. Drum init + bass-sample load can run in parallel;
    // the bass *pattern* itself seeds from the drum continuation, so it
    // has to wait for both.
    await Promise.all([
      initDrumPattern(audioContext),
      initBassPattern(audioContext),
    ])
    await updateBassPattern(getCurrentPattern())

    // 3. Start the loop.
    startLoop(
      audioContext,
      samplePattern,
      drumPattern,
      bassPattern,
      effectPattern,
      {
        scheduleSamples: samplePatternScheduleAt(audioContext, masterBus.in),
        scheduleDrums:   drumPatternScheduleAt(audioContext, masterBus.in),
        scheduleBass:    bassPatternScheduleAt(audioContext, masterBus.in),

        beforeEachCycle: barNumber => {
          maybeMutateEffectsOnBar()
          maybeReshuffle()
          if (barNumber % 2 === 0) updateDrumPattern(audioContext)
          if (barNumber % 4 === 1) updateBassPattern(getCurrentPattern())
        },
        afterEachCycle: incrementPatternAge,
        onEffectChange: handleEffectChangeAt(effectSwitch, masterBus),
      })

    // Triggered by the postprocess worker when a fresh recording survives
    // the gates. Surface the features, place the sample, and reset creep
    // (something useful happened, so the loop doesn't need to wander).
    recordingChain.startRecordingSamples(
      (newRecordedSample, classification, features) => {
        if (features) {
          showSampleInSlot(classification, features, classificationColor(classification))
        }
        addNewRecordedSample(newRecordedSample, classification, features)
        resetCreep()
      })

    hideLoader()
    video().play();

    document.body.classList.add('audio-started')
  } catch (e) {
    console.error('start failed', e)
    await safeStop()
    surfaceStartError(e)
    throw e
  }
}

async function safeStop() {
  try { stopLoop() } catch {}
  try { cancelAllScheduled() } catch {}
  if (recordingChain?.microphoneInputNode) {
    try { recordingChain.microphoneInputNode.disconnect() } catch {}
  }
  if (microphoneStream) {
    try { microphoneStream.getAudioTracks().forEach(t => t.stop()) } catch {}
    microphoneStream = null
  }
  try { await pauseAudioContext(audioContext) } catch {}
  try { await audioContext?.close() } catch {}
  audioContext = undefined
  recordingChain = undefined
  effectSwitch = undefined
  masterBus = undefined
  try { clearAllSamples() } catch {}
  try { clearAllDrums() } catch {}
  try { clearAllBass() } catch {}
  try { clearAllEffects() } catch {}
  try { clearMutationState() } catch {}
  try { resetSampleSlots() } catch {}
  try { setVideoEffect(null) } catch {}
  hideLoader?.()
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
  clearAllBass()
  clearAllEffects()
  clearMutationState()
  resetSampleSlots()
  setVideoEffect(null)
  video().pause();
  hideLoader()
}
