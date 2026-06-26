import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

import { handleIndustrialApi } from './server/industrialApi';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'industrial-api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url?.split('?')[0] ?? '';
          if (url.startsWith('/api/industrial')) {
            const handled = await handleIndustrialApi(req, res, url);
            if (handled) return;
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url?.split('?')[0] ?? '';
          if (url.startsWith('/api/industrial')) {
            const handled = await handleIndustrialApi(req, res, url);
            if (handled) return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api/piece': { target: 'http://localhost:5180', changeOrigin: true },
      '/api/project': { target: 'http://localhost:5180', changeOrigin: true },
      '/api/session': { target: 'http://localhost:5180', changeOrigin: true },
      '/api/lookup': { target: 'http://localhost:5180', changeOrigin: true },
      '/api/workstation': { target: 'http://localhost:5180', changeOrigin: true },
      '/api/factory': { target: 'http://localhost:5180', changeOrigin: true },
      '/api/hardware': { target: 'http://localhost:5180', changeOrigin: true },
      '/api/events': { target: 'http://localhost:5180', changeOrigin: true },
      '/ws': { target: 'ws://localhost:5180', ws: true },
      '/api/projects': {
        target: 'https://pimo.pro',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
