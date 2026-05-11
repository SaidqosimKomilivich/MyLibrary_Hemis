import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8087'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    proxy: {
      // Barcha /api so'rovlarini backendga yo'naltirish
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      // Barcha /uploads so'rovlarini backendga yo'naltirish (rasmlar va PDF)
      '/uploads': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
