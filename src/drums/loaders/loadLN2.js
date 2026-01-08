import kickUrl from '../samples/Oberhiem DMX + LN2 + TOM/LN2 BASS DR.wav'
import snareUrl from '../samples/Oberhiem DMX + LN2 + TOM/LN2 SNAR DR.wav'
import closedHihatUrl from '../samples/Oberhiem DMX + LN2 + TOM/LN2 CLHH.wav'
import openHihatUrl from '../samples/Oberhiem DMX + LN2 + TOM/LN2 OPHH.wav'
import tomUrl from '../samples/Oberhiem DMX + LN2 + TOM/LN2 TOM DR.wav'
import cowbellUrl from '../samples/Oberhiem DMX + LN2 + TOM/LN2 COWBELL.wav'
import {loadSample} from "../loadSample.js";

let LN2Cache

export async function loadLN2(audioContext) {
  console.log('loading LN-2')
  if (LN2Cache) { return LN2Cache; }

  const [
    kick,
    snare,
    hihatClosed,
    hihatOpen,
    tomHigh,
    ride
  ] = await Promise.all([
    kickUrl,
    snareUrl,
    closedHihatUrl,
    openHihatUrl,
    tomUrl,
    cowbellUrl
  ]
    .map(path => loadSample(audioContext, path)))

  LN2Cache = Object.freeze({ kick, snare, hihatClosed, hihatOpen, tomHigh, ride })
  return LN2Cache
}
