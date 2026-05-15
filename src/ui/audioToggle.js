import {audioToggle, audioToggleLabel} from "./uiHandles.js";

const LOADER_CLASS = 'loader';
const DISCO_CLASS = 'disco';

export function attachEventListenersToAudioToggle(start, stop) {
  audioToggle().addEventListener('change', async (e) => {
    if (e.target.checked) {
      try {
        await start()
        audioToggleLabel()?.classList.add(DISCO_CLASS)
      } catch {
        e.target.checked = false
        audioToggleLabel()?.classList.remove(DISCO_CLASS)
      }
    } else {
      await stop()
      audioToggleLabel()?.classList.remove(DISCO_CLASS)
    }
  })
}

export function showLoader() {
  const label = audioToggleLabel()
  const originalInnerHtml = label.innerHTML
  const loader = document.createElement('span');
  loader.classList.add(LOADER_CLASS)
  loader.id = "loader"
  label.innerText = ""
  label.appendChild(loader);
  return () => {
    if (!label.children["loader"]) { return }
    label.removeChild(loader)
    label.innerHTML = originalInnerHtml
    loader.classList.remove(LOADER_CLASS)
  }
}

export function showIsRecording() {
  audioToggleLabel().classList.add('recording');
}

export function resetIsRecording() {
  audioToggleLabel().classList.remove('recording');
}

/**
 * Flip the toggle UI to the paused state without triggering its `change`
 * handler. Used when the app pauses itself in response to something other
 * than a user click — e.g. the selected output device disappeared.
 */
export function syncToggleToPaused() {
  const toggle = audioToggle()
  if (toggle) toggle.checked = false
  audioToggleLabel()?.classList.remove(DISCO_CLASS)
}