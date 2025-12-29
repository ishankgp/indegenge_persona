import { defineConfig, type ProxyOptions } from 'vite'
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
      '/personas', '/cohorts', '/stats', '/health', '/api', '/simulations', '/crm'
    ].reduce((acc, path) => {
      acc[path] = { 
        target: 'http://localhost:8000', 
        changeOrigin: true,
        secure: false,
        ws: true
      };
      return acc;
    }, {} as Record<string, ProxyOptions>)
  }
})
