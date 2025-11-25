// src/polyfills.ts

const g = globalThis;

// Make `global` exist (Magenta deps expect it)
if (!g.global) {
  g.global = g;
}

// Ensure `process` exists
if (!g.process) {
  g.process = {};
}

// Polyfill process.hrtime if missing / not a function
if (typeof g.process.hrtime !== 'function') {
  g.process.hrtime = function hrtime(previous) {
    const now = performance.now() / 1000; // seconds

    let sec = Math.floor(now);
    let nsec = Math.floor((now - sec) * 1e9);

    if (previous) {
      sec -= previous[0];
      nsec -= previous[1];
      if (nsec < 0) {
        sec -= 1;
        nsec += 1e9;
      }
    }

    return [sec, nsec];
  };
}