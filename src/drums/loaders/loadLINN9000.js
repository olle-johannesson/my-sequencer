import kickUrl from '../samples/LINN9000/LINNKICK.wav'
import snareUrl from '../samples/LINN9000/LINN SNARE.wav'
import snare2Url from '../samples/LINN9000/LINN SNARE 2.wav'
import closedHihatUrl from '../samples/LINN9000/LINN CLHH.wav'
import openHihatUrl from '../samples/LINN9000/LINN OPHH.wav'
import tomHighUrl from '../samples/LINN9000/TOM1.WAV'
import tomMidUrl from '../samples/LINN9000/TOM2.WAV'
import tomLowUrl from '../samples/LINN9000/TOM3.WAV'
import rideUrl from '../samples/LINN9000/LINN RIDE3.wav'

import {loadSample} from "../loadSample.js";

let LINN9000Cache

export async function loadLINN9000(audioContext) {
  if (LINN9000Cache) { return LINN9000Cache; }

  const [
    kick,
    snare,
    snare2,
    hihatClosed,
    hihatOpen,
    tomHigh,
    tomMid,
    tomLow,
    ride
  ] = await Promise.all([
    kickUrl,
    snareUrl,
    snare2Url,
    closedHihatUrl,
    openHihatUrl,
    tomHighUrl,
    tomMidUrl,
    tomLowUrl,
    rideUrl
  ]
    .map(path => loadSample(audioContext, path)))

  LINN9000Cache = Object.freeze({ kick, snare, snare2, hihatClosed, hihatOpen, tomHigh, tomMid, tomLow, ride })
  return LINN9000Cache
}
