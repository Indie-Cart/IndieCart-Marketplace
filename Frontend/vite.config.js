import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  server: {
    port: 5173,  // Match the port in your CORS configuration
    open: true,  // Optionally, open the browser automatically
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure proper handling of client-side routing
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  // Handle client-side routing in development
  preview: {
    port: 5173,
    strictPort: true,
    host: true
  }
})
