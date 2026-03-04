import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /books requests to the backend during development
    proxy: {
      '/books': {
        target: process.env.VITE_API_TARGET || 'http://localhost:5555',
        changeOrigin: true,
      },
    },
  },
})
