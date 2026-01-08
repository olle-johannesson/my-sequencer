import kickUrl from '../samples/KORGMINI/BASSDRUM/BDRUM2.WAV'
import snareUrl from '../samples/KORGMINI/SNARES/SNARE10.WAV'
import closedHihatUrl from '../samples/KORGMINI/CYMBALS/HHCLOSE2.WAV'
import openHihatUrl from '../samples/KORGMINI/CYMBALS/HHOPEN1.WAV'
import tomHighUrl from '../samples/KORGMINI/MISC/TOM1.WAV'
import tomMidUrl from '../samples/KORGMINI/MISC/TOM2.WAV'

import {loadSample} from "../loadSample.js";

let KRminiCache

export async function loadKRmini(audioContext) {
  console.log('loading KR mini')
  if (KRminiCache) { return KRminiCache; }

  const [
    kick,
    snare,
    hihatClosed,
    hihatOpen,
    tomHigh,
    tomMid
  ] = await Promise.all([
    kickUrl,
    snareUrl,
    closedHihatUrl,
    openHihatUrl,
    tomHighUrl,
    tomMidUrl,
  ]
    .map(path => loadSample(audioContext, path)))

  KRminiCache = Object.freeze({ kick, snare, hihatClosed, hihatOpen, tomHigh, tomMid })
  return KRminiCache
}
