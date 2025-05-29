import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    cors: true,
    hmr: {
      clientPort: 5174,
      protocol: 'ws',
      host: 'localhost',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  css: {
    postcss: './postcss.config.mjs',
  },
  optimizeDeps: {
    include: ['@headlessui/react', '@heroicons/react']
  },
  define: {
    'process.env': {}
  }
});
