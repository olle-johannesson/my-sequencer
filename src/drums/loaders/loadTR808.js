import kickUrl from '../samples/TR-808/kick.wav'
import snareUrl from '../samples/TR-808/snare.wav'
import clapUrl from '../samples/TR-808/clap.wav'
import closedHihatUrl from '../samples/TR-808/hihatClosed.wav'
import openHihatUrl from '../samples/TR-808/hihatOpen.wav'
import cowbellUrl from '../samples/TR-808/cowbell.wav'
import tomLowUrl from '../samples/TR-808/tomLow.wav'
import tomMidUrl from '../samples/TR-808/tomMid.wav'
import tomHighUrl from '../samples/TR-808/tomHigh.wav'
import crashUrl from '../samples/TR-808/crash.wav'

import {loadSample} from "../loadSample.js";

let TR808Cache

export async function loadTR808(audioContext) {
  if (TR808Cache) { return TR808Cache; }

  const [
    kick,
    snare,
    snare2,
    hihatClosed,
    hihatOpen,
    ride,
    tomLow,
    tomMid,
    tomHigh,
    crash
  ] = await Promise.all([
    kickUrl,
    snareUrl,
    clapUrl,
    closedHihatUrl,
    openHihatUrl,
    cowbellUrl,
    tomLowUrl,
    tomMidUrl,
    tomHighUrl,
    crashUrl
  ]
    .map(path => loadSample(audioContext, path)))

  TR808Cache = Object.freeze({ kick, snare, snare2, hihatClosed, hihatOpen, ride, tomLow, tomMid, tomHigh, crash })
  return TR808Cache
}
