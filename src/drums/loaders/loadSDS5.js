import kickUrl from '../samples/Simmons SDS5/BASSDRUM/BDRUM8.WAV'
import snareUrl from '../samples/Simmons SDS5/SNARES/SNARE1.WAV'
import snare2Url from '../samples/Simmons SDS5/SNARES/SNARE15.WAV'
import closedHihatUrl from '../samples/Simmons SDS5/CYMBALS/HHCLOSE2.WAV'
import pedalHihatUrl from '../samples/Simmons SDS5/CYMBALS/HHPEDAL2.WAV'
import tomHighUrl from '../samples/Simmons SDS5/TOMTOMS/TOM6.WAV'
import tomMidUrl from '../samples/Simmons SDS5/TOMTOMS/TOM7.WAV'
import tomLowUrl from '../samples/Simmons SDS5/TOMTOMS/TOM10.WAV'

import {loadSample} from "../loadSample.js";

let SDS5Cache

export async function loadSDS5(audioContext) {
  console.log('loading SDS5')
  if (SDS5Cache) { return SDS5Cache; }

  const [
    kick,
    snare,
    snare2,
    hihatClosed,
    hihatPedal,
    tomHigh,
    tomMid,
    tomLow,
  ] = await Promise.all([
    kickUrl,
    snareUrl,
    snare2Url,
    closedHihatUrl,
    pedalHihatUrl,
    tomHighUrl,
    tomMidUrl,
    tomLowUrl
  ]
    .map(path => loadSample(audioContext, path)))

  SDS5Cache = Object.freeze({ kick, snare, snare2, hihatClosed, hihatPedal, tomHigh, tomMid, tomLow })
  return SDS5Cache
}
