import kickUrl from '../samples/KAWAI R-50e/BD3_ACOU.WAV'
import clapUrl from '../samples/KAWAI R-50e/CLAP_1.WAV'
import hihatUrl from '../samples/KAWAI R-50e/HAT_C2.WAV'
import clickUrl from '../samples/KAWAI R-50e/CLICK_1.WAV'
import crashUrl from '../samples/KAWAI R-50e/CRASH.WAV'
import {loadSample} from "../loadSample.js";

let KawaiiCache

export async function loadKawaii(audioContext) {
  if (KawaiiCache) { return KawaiiCache; }

  const [
    kick,
    snare,
    hihatClosed,
    tomHigh,
    crash
  ] = await Promise
    .all([ kickUrl, clapUrl, hihatUrl, clickUrl, crashUrl ]
    .map(path => loadSample(audioContext, path)))

  KawaiiCache = Object.freeze({ kick, snare, hihatClosed, tomHigh, crash })
  return KawaiiCache
}
