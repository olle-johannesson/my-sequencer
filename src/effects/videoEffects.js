// =============================================================================
// Video effects — visual counterparts to the audio-effect presets.
// =============================================================================
//
// `setVideoEffect(key)` mirrors the audio effect pattern. Each preset key
// either:
//   - toggles a CSS class on the background video (filter / animation tricks)
//   - runs procedural code (stutter the playback position, play backwards)
//   - or both
//
// Stays in sync with effectSwitch.activate/deactivate via onEffectChange in
// main.js. A null key clears whatever's active.
// =============================================================================

import {video} from '../ui/uiHandles.js'

let activeKey = null

export function setVideoEffect(key) {
  if (key === activeKey) return
  if (activeKey && videoFx[activeKey]) videoFx[activeKey].release()
  activeKey = key
  if (key && videoFx[key]) videoFx[key].apply()
}

// Most effects are pure CSS — toggle a class and let style.css handle it.
function cssClass(name) {
  return {
    apply()   { video()?.classList.add(name) },
    release() { video()?.classList.remove(name) },
  }
}

// Stutter: lock an anchor frame, let the video play forward, snap back to
// the anchor whenever playback has drifted past `loopMs`. Polled at 60 Hz so
// the seek-back happens at most one frame after the loop ends — gives a clean
// looping fragment instead of the frozen-frame artefact you get from
// hammering setCurrentTime every interval.
function stutterEffect(loopMs) {
  let raf = null
  let anchor = 0
  return {
    apply() {
      const v = video()
      if (!v) return
      anchor = v.currentTime
      const loopSec = loopMs / 1000
      const tick = () => {
        if (v.currentTime - anchor >= loopSec) v.currentTime = anchor
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      v.classList.add('fx-stutter')
    },
    release() {
      if (raf) { cancelAnimationFrame(raf); raf = null }
      video()?.classList.remove('fx-stutter')
    },
  }
}

// Reverse: pause the video and step it backwards by chaining seeks via the
// `seeked` event — each step waits for the previous to complete before the
// next is issued. This avoids the queued-seek freeze that you get from a
// fixed-interval setInterval (which fires faster than the browser can finish
// the seek). Reverse rate is then bounded by the browser's seek speed; on
// modern hardware this comes out around 20-30 fps.
function reverseEffect() {
  // Step size per seek. Reverse rate ≈ stepSec × seek-fps. With ~25 seek/s
  // available on modern browsers, 0.1 puts reverse at ~2.5× forward — a
  // satisfying whoosh when it kicks in.
  const stepSec = 0.1
  let v = null
  let active = false

  const stepBack = () => {
    if (!active || !v) return
    const next = v.currentTime - stepSec
    v.currentTime = next > 0.05 ? next : Math.max(0, (v.duration || 1) - 0.05)
  }

  return {
    apply() {
      v = video()
      if (!v) return
      v.classList.add('fx-reverse')
      v.pause()
      active = true
      v.addEventListener('seeked', stepBack)
      stepBack() // kick off the chain
    },
    release() {
      active = false
      if (v) {
        v.removeEventListener('seeked', stepBack)
        v.classList.remove('fx-reverse')
        // Resume normal playback. play() returns a promise on modern browsers;
        // ignore rejection (e.g. user paused mid-reverse).
        v.play().catch(() => {})
        v = null
      }
    },
  }
}

// Maps the audio effect preset keys (see effects/effectSwitch.js) to their
// visual counterparts. Add or rebalance freely — the registry is the single
// source of truth.
const videoFx = {
  // bitcrush family — harsh / crushed colour
  crunch:    cssClass('fx-crunch'),
  lofi:      cssClass('fx-lofi'),
  meltdown:  cssClass('fx-meltdown'),

  // delays — ghosting / blur / pulse
  dub:       cssClass('fx-dub'),
  slapback:  cssClass('fx-slapback'),
  vibrato:   cssClass('fx-vibrato'),

  // filter+drive — saturation / blur waves
  distort:   cssClass('fx-distort'),
  lpWobble:  cssClass('fx-lpwobble'),
  bandDrift: cssClass('fx-banddrift'),

  // gates → stuttered playback (loop lengths in ms; long enough to read as
  // "looping fragment" rather than "frozen frame")
  stutter16:  stutterEffect(280),
  tripletish: stutterEffect(360),

  // grain reverse → actually play backwards
  reverse:   reverseEffect(),

  // pitch — scale (up) / scale (down)
  semitoneUp:   cssClass('fx-pitchup'),
  semitoneDown: cssClass('fx-pitchdown'),

  // reverbs — soft glow / slight blur
  medium: cssClass('fx-reverb-medium'),
  small:  cssClass('fx-reverb-small'),

  // repeat → tighter playback stutters (perceptually faster than the gates)
  repeat1: stutterEffect(180),
  repeat2: stutterEffect(90),
}
