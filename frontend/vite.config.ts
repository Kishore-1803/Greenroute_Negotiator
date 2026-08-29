import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // This is intentionally not prefixed with VITE_: it is used only by the dev server and is
  // never bundled into the browser. The browser always calls the same-origin /api path.
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.GREENROUTE_API_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    // Binding to every interface makes the dev server reachable at http://<host-ip>:5173.
    // The proxy keeps browser requests same-origin, so remote clients do not try their own
    // localhost:8000 and do not need a separate CORS exception.
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: true,
      port: 4173,
      strictPort: true,
    },
    // maplibre-gl ships its own worker bundle; letting Vite's dep-optimizer pre-bundle it breaks
    // the worker's module resolution in dev (net::ERR_FAILED loading maplibre-gl-worker.mjs).
    optimizeDeps: {
      exclude: ['maplibre-gl'],
    },
  }
})
