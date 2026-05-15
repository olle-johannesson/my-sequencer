
// --- Audio play / pause control --------------------------------------------
export const audioToggleLabel  = () => document.getElementById('hold');
export const audioToggle       = () => document.getElementById('audio-toggle');

// --- Background video -------------------------------------------------------
export const video             = () => document.getElementById('bkg-video');

// --- Controls panel & its inputs -------------------------------------------
export const controlsPanel     = () => document.getElementById('controls');
export const inputSourceSelect = () => document.getElementById('input-source');
export const inputSourceLabel  = () => document.querySelector('label[for="input-source"]');
export const inputSourceNote   = () => document.getElementById('input-source-note');
export const outputSourceSelect = () => document.getElementById('output-source');
export const inputMeter        = () => document.getElementById('input-meter');
export const sensitivityGauge  = () => document.getElementById('sensitivity-gauge');
export const filterGauge       = () => document.getElementById('filter-gauge');

// --- Monitoring panel -------------------------------------------------------
export const messagesContainer = () => document.getElementById('messages');
export const messagesPre       = () => document.querySelector('#messages .message');

// --- Panel container --------------------------------------------------------
// All <details> in the panels section. Used by the keyboard-shortcut handler
// to close every open one on Escape, and could be useful for future
// "expand-all" / "collapse-all" UX.
export const allPanelDetails   = () => document.querySelectorAll('#panels details');

