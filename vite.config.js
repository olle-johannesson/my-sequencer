import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    nodePolyfills()
  ],
  define: {
    // some magenta deps expect `global`
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@magenta/music'], // make sure it’s pre-bundled
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
