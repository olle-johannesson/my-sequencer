import {allPresets, createEffectSwitch} from "./effects/effectSwitch.js";
import {setupMasterBus} from "./audio/masterChain.js";
import {addNewRecordedSample, clearMutationState, rescheduleOneOfTheRecordedSamples} from "./patternMutation.js";
import {clearAllSamples, clearSample, samplePattern, samplePatternAge, scheduleSample} from "./patterns/samplePattern.js";
import {getMicrophoneStream, setMicDeviceId, swapLiveMicTo} from "./audio/microphoneInput.js";
import {populateInputSources, setupInputSourceSelect} from "./ui/inputSourceSelect.js";
import {audioFeatureSAB, setupRecordingChain} from "./audio/recordingChain.js";
import {setupInputMeter} from "./ui/inputMeter.js";
import {getFilterAmount, setupSliders} from "./ui/sliders.js";
import {setupKeyboardShortcuts} from "./ui/keyboardShortcuts.js";
import {loadAudioWorklets, pauseAudioContext, startAudioContext} from "./audio/audioSetup.js";
import {clearAllDrums, drumPattern, initDrumPattern, updateDrumPattern} from "./patterns/drumPattern.js";
import {clearAllEffects, effectPattern, updateEffectPattern} from "./patterns/effectPattern.js";
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

let audioContext, microphoneStream, effectSwitch, /*drumSamples,*/ recordingChain, masterBus, hideLoader

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
  // Ok, a lot of things are going to happend now. Basically, there are 3 steps:
  // 1. Set up the audio context and its worklets, as well as the microphone input and master output
  // 2. Initialise a drum pattern with magenta
  // 3. Start the loop
  hideLoader = showLoader()

  // 1. Setting up the audio context and all the workers, worklets, streams and monitoring
  try {
    if (audioContext) {
      // If the audio context is already defined, we don't have to recreate it.
      // The Microphone stream however, is destroyed on every pause. That is because if it is just paused
      // the little microphone icon will still be displayed in the browser and perhaps also by the OS.
      // Tearing down the whole microphone stream removes these. It is a performance loss to restart
      // it every time, but I think it is worth it.
      await audioContext.resume()
      microphoneStream = await getMicrophoneStream(microphoneStream)
      const newMicNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream: microphoneStream})
      newMicNode.connect(recordingChain.tap)
      recordingChain.microphoneInputNode = newMicNode
    } else {

      // If there is no audio context we make one. This is also the opportunity to create all the
      // worklet nodes and reset the diagnostics.
      audioContext = await startAudioContext()
      setDiagnostic('outputLatency ms', audioContext.outputLatency * 1000)
      setDiagnostic('baseLatency ms', audioContext.baseLatency * 1000)
      setDiagnostic('sampleRate', audioContext.sampleRate)
      await loadAudioWorklets(audioContext);

      // If there is no audio context there can be no microphone input stream or master output. Neither
      // can there be worklets, so the effects will have to be set up also.
      [microphoneStream, effectSwitch, masterBus] = await Promise.all([
        getMicrophoneStream(microphoneStream),
        createEffectSwitch(audioContext),
        setupMasterBus(audioContext, spectrumSize)
      ]);

      // Next up is the recording chain. These are also worklets and workers in tandem, sending messages and
      // things like that.
      recordingChain = await setupRecordingChain(
        audioContext,
        microphoneStream,
        {
          onRecordStart: showIsRecording,
          onRecordStop: resetIsRecording
        })

      // Last thing to do is to check what input sources are available and make them selectable.
      populateInputSources()
    }

    // 2. Setting up an initial drum pattern
    await initDrumPattern(audioContext)

    // 3. Starting the loop
    startLoop(
      audioContext,
      masterBus.in,
      samplePattern,
      drumPattern,
      effectPattern,
      {
        beforeEachCycle: barNumber => {
          // This is called right before entering the next bar, so this function has to run fairly quickly.
          // That means anything that takes time (e.g. ML pattern eval) should have been cached.

          // Check manual slider input and update the effects accordingly
          const filt = getFilterAmount()
          const chance    = filt / 3
          const intensity = Math.min(1, filt / 2)
          if (Math.random() < chance) {
            updateEffectPattern(Object.keys(allPresets), intensity)
          }

          // Keep things interesting. If there hasn't been anything recorded for a while,
          // stir things up.
          if (samplePatternAge > 1) {
            rescheduleOneOfTheRecordedSamples(scheduleSample, clearSample)
          }

          // Every other bar we can adjust the drum pattern a bit, so it doesn't feel stale. Also, if the
          // ML model has made a crap beat it doesn't last too long.
          if (barNumber % 2 === 0) {
            updateDrumPattern(audioContext)
          }
        },

        onEffectChange: (newFx, _oldFx, time) => {
          // When the looper changes effect it calls this, so it doesn't have to know how to change effects
          if (newFx) {
            const def = typeof newFx === 'string'
              ? allPresets[newFx] :
              newFx
            if (def) {
              effectSwitch.activate(def.chain, def.preset, time, masterBus.in, masterBus.out)
            }
          } else {
            effectSwitch.deactivate(time)
          }
          // keeping the video effects in sync with the audio effects
          setVideoEffect(typeof newFx === 'string' ? newFx : null)
        },
      })

    recordingChain.startRecordingSamples(
      (newRecordedSample, classification, features) => {
        // This is the callback triggered by return messages from the analysis worker thread.
        // We display the analysis is the monitoring panel and schedule the new sample
        // according to its classification
        if (features) {
          showSampleInSlot(classification, features, classificationColor(classification))
        }
        addNewRecordedSample(newRecordedSample, scheduleSample, clearSample, classification)

        // This also means that a useful thing was recorded, so this is a good place to reset
        // the inactivity creep
        resetCreep()
      })

    // Phew! We made it all through the setup process! Now we can hide the loader and start playing the video.
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
  clearAllEffects()
  clearMutationState()
  resetSampleSlots()
  setVideoEffect(null)
  video().pause();
  hideLoader()
}
