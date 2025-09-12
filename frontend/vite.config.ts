import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: [
      '/personas', '/cohorts', '/stats', '/health', '/api'
    ].reduce((acc, path) => {
      acc[path] = { target: 'http://127.0.0.1:8000', changeOrigin: true };
      return acc;
    }, {} as Record<string, any>)
  }
})
