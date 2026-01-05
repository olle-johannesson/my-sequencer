import {loadKawaii} from "./loaders/loadKawaii.js";
import {loadLN2} from "./loaders/loadLN2.js";


const loaders = [
  loadKawaii,
  loadLN2
]

export async function loadRandomDrums(audioContext) {
  return loaders[Math.floor(Math.random() * loaders.length)](audioContext)
}



