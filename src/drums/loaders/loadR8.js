import kickUrl from '../samples/R8/kick.wav'
import snareUrl from '../samples/R8/snare.wav'
import sidestickUrl from '../samples/R8/sidestick.wav'
import closedHihatUrl from '../samples/R8/hihatClosed.wav'
import openHihatUrl from '../samples/R8/hihatOpen.wav'
import pedalHihatUrl from '../samples/R8/hihatPedal.wav'
import crashUrl from '../samples/R8/crash.wav'
import rideUrl from '../samples/R8/ride.wav'
import tomHighUrl from '../samples/R8/tomHigh.wav'
import tomMidUrl from '../samples/R8/tomMid.wav'
import tomLowUrl from '../samples/R8/tomLow.wav'

import {loadSample} from "../loadSample.js";

let R8Cache

export async function loadR8(audioContext) {
  if (R8Cache) { return R8Cache; }

  const [
    kick,
    snare,
    snare2,
    hihatClosed,
    hihatOpen,
    hihatPedal,
    crash,
    ride,
    tomHigh,
    tomMid,
    tomLow
  ] = await Promise.all([
    kickUrl,
    snareUrl,
    sidestickUrl,
    closedHihatUrl,
    openHihatUrl,
    pedalHihatUrl,
    crashUrl,
    rideUrl,
    tomHighUrl,
    tomMidUrl,
    tomLowUrl
  ]
    .map(path => loadSample(audioContext, path)))

  R8Cache = Object.freeze({ kick, snare, snare2, hihatClosed, hihatOpen, hihatPedal, crash, ride, tomHigh, tomMid, tomLow })
  return R8Cache
}
