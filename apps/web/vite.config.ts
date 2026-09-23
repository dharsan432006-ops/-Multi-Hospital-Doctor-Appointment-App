import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockApiPlugin } from './mockApiPlugin.js';

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
  define: {
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(
      process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDTfjPBRQWiw1EJLWNS5QfIq9eOvF3KjfU'
    ),
    'import.meta.env.VITE_API_URL': JSON.stringify('/api'),
  },
  optimizeDeps: {
    include: ['@vis.gl/react-google-maps', '@tanstack/react-query', 'react-router-dom'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          query: ['@tanstack/react-query'],
          charts: ['recharts'],
          maps: ['@vis.gl/react-google-maps'],
        },
      },
    },
  },
});
