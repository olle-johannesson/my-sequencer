import {audioToggle, audioToggleLabel} from "./uiHandles.js";

const LOADER_CLASS = 'loader';
const DISCO_CLASS = 'disco';

export function attachEventListenersToAudioToggle(start, stop) {
  // The label's native for=audio-toggle association toggles the checkbox.
  // We listen to the checkbox's change event to drive audio start/stop —
  // letting the browser handle the click side keeps things simple and
  // means CSS :checked / :has() selectors stay in sync automatically.
  audioToggle().addEventListener('change', async (e) => {
    if (e.target.checked) {
      try {
        await start()
        audioToggleLabel()?.classList.add(DISCO_CLASS)
      } catch {
        // start() already cleaned itself up and surfaced a message —
        // we just need to flip the checkbox back so the UI matches reality.
        // Note: setting `checked` programmatically does not fire `change`,
        // so this won't re-enter the handler.
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