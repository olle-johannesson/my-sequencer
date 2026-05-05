import {allPanelDetails, audioToggle} from './uiHandles.js'

const dontInterfereWithTheseTags = new Set(['INPUT', 'SELECT', 'TEXTAREA'])

export function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = e.target?.tagName
    if (dontInterfereWithTheseTags.has(tag) || e.target?.isContentEditable) {
      return
    }

    switch (e.code) {
      case 'Space': onSpace(e); break;
      case 'Escape': onEscape(); break;
    }
  })
}

const onSpace = e => {
  e.preventDefault()
  audioToggle()?.click()
}

const onEscape = () => {
  allPanelDetails().forEach(d => d.removeAttribute('open'))
  const toggle = audioToggle()
  if (toggle?.checked) toggle.click()
}