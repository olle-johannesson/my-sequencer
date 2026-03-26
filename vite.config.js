import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [
    nodePolyfills(),
    mkcert()
  ],
  define: {
    // some magenta deps expect `global`
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@magenta/music'], // make sure it’s pre-bundled
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
