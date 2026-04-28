import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const toneStubPath = path.resolve(__dirname, 'src/util/toneStub.js')
const magentaCompatPath = path.resolve(__dirname, 'src/util/magentaCompat.js')

// Esbuild plugin: applied to optimizeDeps pre-bundling. Vite's resolve.alias
// is honored by Rollup (build / module-graph) but NOT by esbuild's pre-bundler,
// so we register the same redirects here too — otherwise the cached pre-bundle
// in node_modules/.vite/deps/ ends up with the originals inlined.
const magentaAliasesEsbuildPlugin = {
  name: 'magenta-aliases',
  setup(build) {
    build.onResolve({ filter: /^tone$/ }, () => ({ path: toneStubPath }))
    build.onResolve({ filter: /\/compat\/global(_browser)?(\.js)?$/ }, () => ({ path: magentaCompatPath }))
  },
}

export default defineConfig({
  base: "./",
  plugins: [
    mkcert(),
  ],
  define: {
    // Transitive deps (e.g. typedarray-pool) reference bare `global`.
    // Safe to rewrite now that Magenta's compat/global.js (which would
    // mis-detect Node via globalThis.process) is aliased away below.
    global: 'globalThis',
  },
  resolve: {
    alias: [
      // Magenta's compat/global.js references bare `global` and conditionally
      // `require('node-fetch')`, and its sibling compat/global_browser.js throws
      // in a Worker context (because audio_utils.js calls getOfflineAudioContext
      // at module-load time). We replace BOTH with a worker-tolerant shim that
      // returns null from getOfflineAudioContext when no OfflineAudioContext API
      // exists. Safe because we never call magenta's audio paths.
      // See src/util/magentaCompat.js.
      { find: /^.*\/compat\/global(_browser)?$/, replacement: magentaCompatPath },

      // Tone.js does import-time work (touches `window`, builds an
      // OfflineAudioContext, sets up a default audio context) that breaks in a
      // Web Worker context. Magenta transitively imports Tone via its playback
      // modules (Player, Recorder, Metronome, etc.) — none of which we use.
      // Aliasing `tone` to a no-op stub means Tone never enters the bundle:
      // import-time errors disappear, and we save ~150 KB.
      // See src/util/toneStub.js.
      { find: /^tone$/, replacement: toneStubPath },
    ],
  },
  optimizeDeps: {
    include: ['@magenta/music'],
    esbuildOptions: {
      plugins: [magentaAliasesEsbuildPlugin],
    },
  },
  // Workers default to IIFE output, which can't host the dynamic
  // `import('@magenta/music')` inside magenta.worker.js (dynamic imports
  // trigger code-splitting which IIFE doesn't support). ES module output
  // matches how we instantiate the worker on the main thread:
  //   new Worker(new URL(...), { type: 'module' })
  worker: {
    format: 'es',
  },
  server: {
    host: true,
    https: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
