import kickUrl from '../samples/SP-12/kick.wav'
import snareUrl from '../samples/SP-12/snare.wav'
import clapUrl from '../samples/SP-12/clap.wav'
import rimUrl from '../samples/SP-12/rim.wav'
import closedHihatUrl from '../samples/SP-12/hihatClosed.wav'
import openHihatUrl from '../samples/SP-12/hihatOpen.wav'
import rideUrl from '../samples/SP-12/ride.wav'
import crashUrl from '../samples/SP-12/crash.wav'
import tomLowUrl from '../samples/SP-12/tomLow.wav'
import tomMidUrl from '../samples/SP-12/tomMid.wav'
import tomHighUrl from '../samples/SP-12/tomHigh.wav'

import {loadSample} from "../loadSample.js";

let SP12Cache

export async function loadSP12(audioContext) {
  if (SP12Cache) { return SP12Cache; }

  const [
    kick,
    snare,
    snare2,
    hihatPedal,
    hihatClosed,
    hihatOpen,
    ride,
    crash,
    tomLow,
    tomMid,
    tomHigh
  ] = await Promise.all([
    kickUrl,
    snareUrl,
    clapUrl,
    rimUrl,
    closedHihatUrl,
    openHihatUrl,
    rideUrl,
    crashUrl,
    tomLowUrl,
    tomMidUrl,
    tomHighUrl
  ]
    .map(path => loadSample(audioContext, path)))

  SP12Cache = Object.freeze({ kick, snare, snare2, hihatPedal, hihatClosed, hihatOpen, ride, crash, tomLow, tomMid, tomHigh })
  return SP12Cache
}
