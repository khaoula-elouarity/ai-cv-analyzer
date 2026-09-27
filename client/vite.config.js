import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // VITE_API_URL is baked in at build time on Vercel/Render, so read it here
  // rather than hardcoding a host.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        // Lets /api and /uploads work in dev without CORS or cookies issues.
        '/api': { target: env.VITE_API_URL || 'http://localhost:5000', changeOrigin: true },
        '/uploads': { target: env.VITE_API_URL || 'http://localhost:5000', changeOrigin: true },
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
