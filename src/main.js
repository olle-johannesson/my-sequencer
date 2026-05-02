import {allPresets, createEffectSwitch} from "./effects/effectSwitch.js";
import {setupMasterBus} from "./audio/masterChain.js";
import {addNewRecordedSample, rescheduleOneOfTheRecordedSamples} from "./patternMutation.js";
import {clearAllSamples, clearSample, samplePattern, samplePatternAge, scheduleSample} from "./patterns/samplePattern.js";
import {getMicrophoneStream, setMicDeviceId} from "./audio/microphoneInput.js";
import {populateInputSources, setupInputSourceSelect} from "./ui/inputSourceSelect.js";
import {audioFeatureSAB, setupRecordingChain} from "./audio/recordingChain.js";
import {setupInputMeter} from "./ui/inputMeter.js";
import {getFilterAmount, setupSliders} from "./ui/sliders.js";
import {loadAudioWorklets, pauseAudioContext, startAudioContext} from "./audio/audioSetup.js";
import {clearAllDrums, drumPattern, initDrumPattern, updateDrumPattern} from "./patterns/drumPattern.js";
import {clearAllEffects, effectPattern, updateEffectPattern} from "./patterns/effectPattern.js";
import {creepEffectChance, creepIntensity, resetCreep} from "./patterns/creep.js";
import {setDiagnostic, sparkline} from "./ui/messages.js";
import {startMainThreadMonitor} from "./dev/mainThreadMonitor.js";
import {startLoop, stopLoop} from "./looper.js";
import {cancelAllScheduled} from "./audio/samplePlayer.js";
import {attachEventListenersToAudioToggle, resetIsRecording, showIsRecording, showLoader} from "./ui/audioToggle.js";
import {spectrumSize} from "./config.js";
import {video} from "./ui/uiHandles.js";
import {getVideoUrl} from "./ui/loadvideo.js";

video().src = getVideoUrl()
video().load();
const effectKeys = Object.keys(allPresets)
startMainThreadMonitor()

// Group classifications into rough sonic families for at-a-glance UI feedback.
//   green  = low-frequency / body
//   orange = midrange / snappy
//   blue   = bright / airy
//   purple = sustained / shimmery
const CLASSIFICATION_COLORS = {
  BASSY:        '#5a9',
  RUMBLY_LOW:   '#5a9',
  RUMBLY_MID:   '#5a9',
  RUMBLY_HIGH:  '#5a9',
  SNAPPY:       '#e95',
  PERCUSSIVE:   '#e95',
  BRIGHT:       '#9bd',
  AIRY:         '#9bd',
  CYMBAL_CRASH: '#9bd',
  SUSTAINED:    '#a7e',
}
const classificationColor = c => CLASSIFICATION_COLORS[c] ?? '#aaa'

// Establish display order in the diagnostic panel by seeding keys at module
// load. setDiagnostic preserves existing keys' insertion order on update, so
// later real values just fill these in without reshuffling.
//   1. figures (numbers)
//   2. recorded-sample sparklines
//   3. line charts (chartDiagnostic — those are separate DOM rows below the pre)
const FIGURE_KEYS = [
  'outputLatency ms',
  'baseLatency ms',
  'sampleRate',
  'main thread stalls/1s',
  'analysis avg ms',
  'analysis max ms',
  'analysis blocks/0.5s',
  'inter-msg avg ms',
]
for (const key of FIGURE_KEYS) setDiagnostic(key, '—', 'rgba(128,128,128,0.7)')

// 5-deep FIFO of recorded-sample rows in the diagnostics panel. Each new
// recording lands in the next slot (cycling), so all five stay visible
// permanently after the first five recordings.
const SAMPLE_SLOTS = 5
let sampleSlotIndex = 0
for (let i = 0; i < SAMPLE_SLOTS; i++) {
  setDiagnostic(`sample ${i}`, '— empty —', 'rgba(128,128,128,0.4)')
}

function showSampleInSlot(classification, features, color) {
  const items = [
    {value: features.duration,         max: 2},
    {value: features.decayTime,        max: 1},
    {value: features.lowRatio,         max: 1},
    {value: features.highRatio,        max: 1},
    {value: features.spectralCentroid, max: 10000},
    {value: features.spectralFlatness, max: 1},
  ]
  const slot = sampleSlotIndex % SAMPLE_SLOTS
  sampleSlotIndex++
  setDiagnostic(`sample ${slot}`, `${classification.padEnd(13)} ${sparkline(items)}`, color)
}


let audioContext, microphoneStream, effectSwitch, /*drumSamples,*/ recordingChain, masterBus, hideLoader

async function start() {
  hideLoader = showLoader()
  try {
    await startInner()
    // First successful start swaps the play-button icon from mic → play/pause.
    // The class stays for the rest of the session; subsequent pauses show
    // play, not mic, since the mic affordance is no longer informative.
    document.body.classList.add('audio-started')
  } catch (e) {
    console.error('start failed', e)
    await safeStop()
    surfaceStartError(e)
    throw e // let the toggle handler uncheck
  }
}

async function startInner() {
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

    // Now that getUserMedia has succeeded, device labels are readable —
    // refresh the dropdown so the user sees real device names.
    populateInputSources()

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

        // Filter slider has full authority over effect-pattern mutation.
        // Slider 0 → never mutate (no effects). Slider 3 → mutate every bar
        // at full intensity (radical, regions long, mostly adds, pattern
        // saturates fast). Creep no longer contributes — at 0 the user
        // genuinely gets a clean signal.
        const filt = getFilterAmount() // 0..3
        const chance    = filt / 3                  // 0..1
        const intensity = Math.min(1, filt / 2)     // 0..1 (saturates at filt=2)
        if (Math.random() < chance) {
          updateEffectPattern(effectKeys, intensity)
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
    (newRecordedSample, classification, features) => {
      const color = classificationColor(classification)
      if (features) {
        showSampleInSlot(classification, features, color)
      }
      addNewRecordedSample(newRecordedSample, scheduleSample, clearSample, classification)
      resetCreep()
    })
  hideLoader()
  video().play();
}

// Best-effort cleanup: never throw. Called from start()'s catch path so a
// half-set-up audio graph gets torn down and the next start() retries from
// scratch (audioContext goes back to null so the "first time" branch runs).
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
  hideLoader?.()
}

function surfaceStartError(e) {
  let msg
  switch (e?.name) {
    case 'NotAllowedError':
      msg = 'Microphone access denied. Allow it in your browser settings to enable recording.'
      break
    case 'NotFoundError':
      msg = 'No microphone found. Connect an input device and try again.'
      break
    case 'NotReadableError':
      msg = 'Microphone is in use by another app. Close it and try again.'
      break
    default:
      msg = `Could not start: ${e?.message || e}`
  }
  setDiagnostic('start error', msg, '#f55')
  // Pop the Controls panel open so the user sees the message.
  document.getElementById('controls')?.setAttribute('open', '')
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
  video().pause();
  hideLoader()
}

attachEventListenersToAudioToggle(start, stop)
setupInputMeter(audioFeatureSAB)
setupSliders()

// Populate the input-source dropdown immediately (labels may be blank pre-permission)
// and re-populate after the first start() so labels fill in.
setupInputSourceSelect(async (deviceId) => {
  setMicDeviceId(deviceId)
  // Live-swap only makes sense if the audio chain is up.
  if (!audioContext || !recordingChain) return
  await swapLiveMicTo(deviceId)
})

async function swapLiveMicTo(deviceId) {
  // Tear down the previous stream + audio source node, then bring up a new
  // one from the chosen device and rewire it into the recording chain.
  if (microphoneStream) {
    microphoneStream.getAudioTracks().forEach(t => t.stop())
    microphoneStream = null
  }
  if (recordingChain.microphoneInputNode) {
    try { recordingChain.microphoneInputNode.disconnect() } catch {}
  }

  try {
    microphoneStream = await getMicrophoneStream(null)
    const newNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream: microphoneStream})
    newNode.connect(recordingChain.tap)
    recordingChain.microphoneInputNode = newNode
  } catch (e) {
    console.error('failed to swap input device', e)
  }
}
