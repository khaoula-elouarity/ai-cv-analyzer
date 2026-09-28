import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // VITE_API_URL is baked in at build time on Vercel/Render, so read it here
  // rather than hardcoding a host.
  const env = loadEnv(mode, process.cwd(), '');

  /**
   * Origin the dev proxy forwards to. It must be a bare origin: the proxy is
   * mounted on '/api' and '/uploads' and appends the rest of the path, so a
   * target like 'http://localhost:5000/api' would forward '/api/api/auth/login'
   * and 404. Strip the suffix defensively so a value copied from the README
   * still works, and allow a separate host via VITE_DEV_PROXY_TARGET.
   */
  const proxyTarget = (env.VITE_DEV_PROXY_TARGET || env.VITE_API_URL || 'http://localhost:5000')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // Without this Vite silently moves to 5174 if 5173 is taken, which takes
      // the app out of the server's CLIENT_URL/CORS allow-list.
      strictPort: true,
      proxy: {
        // Lets /api and /uploads work in dev without CORS or cookies issues.
        // With no reachable backend these answer 502, which is what surfaces
        // in the console when the server has not been started.
        '/api': { target: proxyTarget, changeOrigin: true },
        '/uploads': { target: proxyTarget, changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          // Vite 8 bundles with rolldown, which uses `advancedChunks.groups`
          // rather than rollup's object-form `manualChunks`. Splitting the
          // stable vendor code keeps repeat deploys to a small diff.
          advancedChunks: {
            groups: [
              {
                name: 'react',
                test: /node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
              },
              { name: 'icons', test: /node_modules[\\/]lucide-react[\\/]/ },
            ],
          },
        },
      },
    },
  };
});
