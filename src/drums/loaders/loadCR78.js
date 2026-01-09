import kickUrl from '../samples/CR78 + MA101/CR78 BD.wav'
import snareUrl from '../samples/CR78 + MA101/CR78 SD.wav'
import closedHihatUrl from '../samples/CR78 + MA101/CR78 HIHAT.wav'
import openHihatUrl from '../samples/CR78 + MA101/CR-78 OPHH 2.wav'
import tomHighUrl from '../samples/CR78 + MA101/CR78 HIBONGO.wav'
import tomMidUrl from '../samples/CR78 + MA101/CR78 LOBONGO.wav'
import tomLowUrl from '../samples/CR78 + MA101/CR78 CONGA.wav'
import crashUrl from '../samples/CR78 + MA101/CR78 CYMBMAL.wav'

import {loadSample} from "../loadSample.js";

let CR78Cache

export async function loadCR78(audioContext) {
  if (CR78Cache) { return CR78Cache; }

  const [
    kick,
    snare,
    hihatClosed,
    hihatOpen,
    tomHigh,
    tomMid,
    tomLow,
    crash
  ] = await Promise.all([
    kickUrl,
    snareUrl,
    closedHihatUrl,
    openHihatUrl,
    tomHighUrl,
    tomMidUrl,
    tomLowUrl,
    crashUrl
  ]
    .map(path => loadSample(audioContext, path)))

  CR78Cache = Object.freeze({ kick, snare, hihatClosed, hihatOpen, tomHigh, tomMid, tomLow, crash })
  return CR78Cache
}
