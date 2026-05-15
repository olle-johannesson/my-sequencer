import {createEffectSwitch, handleEffectChangeAt} from "./effects/effectSwitch.js";
import {setupMasterBus} from "./audio/masterChain.js";
import {addNewRecordedSample, clearMutationState, maybeReshuffle} from "./patternMutation.js";
import {clearAllSamples, incrementPatternAge, samplePattern, scheduleAt as samplePatternScheduleAt} from "./patterns/samplePattern.js";
import {getMicrophoneStream, setMicDeviceId, swapLiveMicTo} from "./audio/microphoneInput.js";
import {populateInputSources, setupInputSourceSelect} from "./ui/inputSourceSelect.js";
import {populateOutputSources, setupOutputSourceSelect} from "./ui/outputSourceSelect.js";
import {applyOutputDevice, setOutputDeviceId} from "./audio/outputDevice.js";
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
import {cancelAllScheduled, playMonophonicSampleAt, playSampleAt} from "./audio/samplePlayer.js";
import {attachEventListenersToAudioToggle, resetIsRecording, showIsRecording, showLoader} from "./ui/audioToggle.js";
import {spectrumSize} from "./config.js";
import {video} from "./ui/uiHandles.js";
import {getVideoUrl} from "./ui/loadvideo.js";
import {setVideoEffect} from "./effects/videoEffects.js";
import {classificationColor, resetSampleSlots, setupMonitoringPanel, showSampleInSlot, surfaceStartError} from "./ui/monitoringPanel.js";

let audioContext, microphoneStream, effectSwitch, recordingChain, masterBus, hideLoader
// Set by softStop, cleared by start() after one resume — keeps the next
// start from re-initialising drum / bass / sample patterns so the user
// picks up exactly where they left off.
let wasSoftStopped = false

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
setupOutputSourceSelect(async (deviceId) => {
  setOutputDeviceId(deviceId)
  // Apply immediately if the audio chain is up; otherwise start() picks it up.
  if (audioContext) await applyOutputDevice(audioContext)
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
      populateOutputSources()
    }

    // Route audio to the user's chosen output device (if any, and if the
    // browser supports setSinkId). On resume this re-asserts the choice in
    // case the device list shifted while we were paused.
    await applyOutputDevice(audioContext)

    // 2. Initial patterns. Drum init + bass-sample load can run in parallel;
    // the bass *pattern* itself seeds from the drum continuation, so it
    // has to wait for both. Skipped on resume from softStop — the existing
    // patterns are still in memory and we want to land right back on them.
    if (!wasSoftStopped) {
      await Promise.all([
        initDrumPattern(audioContext),
        initBassPattern(audioContext),
      ])
      await updateBassPattern(getCurrentPattern())
    }
    wasSoftStopped = false

    // 3. Start the loop.
    startLoop(
      audioContext,
      samplePattern,
      drumPattern,
      bassPattern,
      effectPattern,
      {
        scheduleSamples: samplePatternScheduleAt(audioContext, masterBus.in, playMonophonicSampleAt),
        scheduleDrums:   drumPatternScheduleAt(audioContext, masterBus.in, playSampleAt),
        scheduleBass:    bassPatternScheduleAt(audioContext, masterBus.in, playMonophonicSampleAt),

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

/**
 * Pause the way an external interruption should pause — the user's pattern
 * state stays in memory so the next start picks up exactly where we left
 * off. Used when the selected output device disappears, etc. The mic and
 * loop go down (so the browser drops its mic indicator and the scheduler
 * idles), but `audioContext` stays alive for a fast resume.
 */
async function softStop() {
  wasSoftStopped = true
  stopLoop()
  cancelAllScheduled()
  if (recordingChain?.microphoneInputNode) {
    try { recordingChain.microphoneInputNode.disconnect() } catch {}
  }
  if (microphoneStream) {
    microphoneStream.getAudioTracks().forEach(t => t.stop())
    microphoneStream = null
  }
  await pauseAudioContext(audioContext)
  setVideoEffect(null)
  video().pause()
}
