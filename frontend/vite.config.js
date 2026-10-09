import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy:{
      '/metrics':'http://127.0.0.1:8000',
      '/logs':'http://127.0.0.1:8000',
      '/tasks':'http://127.0.0.1:8000',
      '/zones': 'http://127.0.0.1:8000',
    },
  },
})
