import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert'

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
    // Magenta's compat/global.js references bare `global` and conditionally
    // `require('node-fetch')`. global_browser.js next to it exports the same
    // names, purely browser-flavored.
    alias: [
      { find: /^.*\/compat\/global$/, replacement: '@magenta/music/esm/core/compat/global_browser' },
    ],
  },
  optimizeDeps: {
    include: ['@magenta/music'],
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
