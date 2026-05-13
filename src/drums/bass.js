// Pre-recorded bass samples. Treated as a flat pool the bass-pattern picks
// from at start — there's no per-slot semantics like the drum kits have,
// since the bass pattern only ever uses one sample at a time.
//
// Lazy `import('…?url')` keeps the binaries out of the main bundle and lets
// Vite hash them for cache-busting.
export const bassSamples = [
  // () => import('./samples/bass/BASSELEC.WAV?url'),
  // () => import('./samples/bass/BASSFNK1.WAV?url'),
  // () => import('./samples/bass/BASSFNK2.WAV?url'),
  () => import('./samples/bass/SYN K 2.wav?url'),
]
