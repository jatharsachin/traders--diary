import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/dhan-api': {
        target: 'https://api.dhan.co/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dhan-api/, ''),
        secure: true,
      }
    }
  }
})
