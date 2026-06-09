import path from 'node:path';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, '../chikicha-backend/src'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['localhost', 'semblante.local', '192.168.5.103'],
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
