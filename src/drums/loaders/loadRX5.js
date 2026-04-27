import kickUrl from '../samples/RX5/kick.wav'
import snareUrl from '../samples/RX5/snare.wav'
import clapUrl from '../samples/RX5/clap.wav'
import rimUrl from '../samples/RX5/rim.wav'
import closedHihatUrl from '../samples/RX5/hihatClosed.wav'
import openHihatUrl from '../samples/RX5/hihatOpen.wav'
import pedalHihatUrl from '../samples/RX5/hihatPedal.wav'
import crashUrl from '../samples/RX5/crash.wav'
import tomHighUrl from '../samples/RX5/tomHigh.wav'
import tomMidUrl from '../samples/RX5/tomMid.wav'
import tomLowUrl from '../samples/RX5/tomLow.wav'

import {loadSample} from "../loadSample.js";

let RX5Cache

export async function loadRX5(audioContext) {
  if (RX5Cache) { return RX5Cache; }

  const [
    kick,
    snare,
    snare2,
    ride,
    hihatClosed,
    hihatOpen,
    hihatPedal,
    crash,
    tomHigh,
    tomMid,
    tomLow
  ] = await Promise.all([
    kickUrl,
    snareUrl,
    clapUrl,
    rimUrl,
    closedHihatUrl,
    openHihatUrl,
    pedalHihatUrl,
    crashUrl,
    tomHighUrl,
    tomMidUrl,
    tomLowUrl
  ]
    .map(path => loadSample(audioContext, path)))

  RX5Cache = Object.freeze({ kick, snare, snare2, ride, hihatClosed, hihatOpen, hihatPedal, crash, tomHigh, tomMid, tomLow })
  return RX5Cache
}
