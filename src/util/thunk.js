export const thunk = x => typeof x === 'function' ? x() : x
