import kickUrl from '../samples/Drumulator/kick.wav'
import snareUrl from '../samples/Drumulator/snare.wav'
import clapUrl from '../samples/Drumulator/clap.wav'
import closedHihatUrl from '../samples/Drumulator/hihatClosed.wav'
import openHihatUrl from '../samples/Drumulator/hihatOpen.wav'
import rideUrl from '../samples/Drumulator/ride.wav'
import tomLowUrl from '../samples/Drumulator/tomLow.wav'
import tomMidUrl from '../samples/Drumulator/tomMid.wav'
import tomHighUrl from '../samples/Drumulator/tomHigh.wav'
import crashUrl from '../samples/Drumulator/crash.wav'

import {loadSample} from "../loadSample.js";

let DrumulatorCache

export async function loadDrumulator(audioContext) {
  if (DrumulatorCache) { return DrumulatorCache; }

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
    rideUrl,
    tomLowUrl,
    tomMidUrl,
    tomHighUrl,
    crashUrl
  ]
    .map(path => loadSample(audioContext, path)))

  DrumulatorCache = Object.freeze({ kick, snare, snare2, hihatClosed, hihatOpen, ride, tomLow, tomMid, tomHigh, crash })
  return DrumulatorCache
}
