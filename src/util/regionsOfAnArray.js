import {getNormallyDistributedNumber} from "../../../../../dev/my-sequencer/src/util/random";

const rndIndex = a => Math.random() * a.length | 0
const rndIndexThatsTruthy = a => {
  let scrambledIndices = [...new Array(a.length).keys()].sort(() => Math.random() - 0.5)
  for (let i of scrambledIndices) {
    if (a === 0 || a[i]) return i
  }
  return -1
}

const addARandomRegion = (a, value) => {
  let i = rndIndex(a)
  let len = getNormallyDistributedNumber(0, 3)
  let start = i
  let end = (i + Math.abs(Math.round(len))) % a.length
  return addARegion(a,start,end,value)
}

let addARegion = (a, start, end, value) => {
  const b = a.slice()
  const len = b.length

  let i = ((Math.round(start) % len) + len) % len
  const e = ((Math.round(end) % len) + len) % len

  do b[i] = value
  while ((i = (i + 1) % len) !== (e + 1) % len)

  return b
}

const removeRandomRegion = a => {
  const incr = x => (x + 1) % a.length
  const decr = x => (x - 1 + a.length) % a.length
  const i = rndIndexThatsTruthy(a)
  if (i < 0) return a.slice()
  const target = a[i]
  let start = i
  let end = i
  while (a[decr(start)] === target && decr(start) !== i) start = decr(start)
  while (a[incr(end)] === target && incr(end) !== i) end = incr(end)
  return addARegion(a, start, end, null)
}
