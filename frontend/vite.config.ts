import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Needed for Docker to map ports correctly if running dev mode in docker
    port: 80,
    proxy: {
      '/api': {
        target: 'http://thingsboard:9090', // 'thingsboard' is the service name in docker-compose
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
