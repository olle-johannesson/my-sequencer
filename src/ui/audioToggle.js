import {audioToggle, audioToggleLabel} from "./uiHandles.js";

const LOADER_CLASS = 'loader';
const DISCO_CLASS = 'disco';

export function attachEventListenersToAudioToggle(start, stop) {
  audioToggleLabel().addEventListener('touchend', e => onclick(e, start, stop))
  audioToggleLabel().addEventListener('click', e => onclick(e, start, stop));
}

async function onclick(e, start, stop) {
  e.preventDefault()
  const toggle = audioToggle()
  toggle.checked = !toggle.checked
  // updateButtonPosition();
  if (toggle.checked) {
    await start();
    e.target.classList.add(DISCO_CLASS);
  } else {
    await stop();
    e.target.classList.remove(DISCO_CLASS);
  }
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