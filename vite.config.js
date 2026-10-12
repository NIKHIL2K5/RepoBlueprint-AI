import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ollama': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, '')
      },
      '/tts': {
        target: 'https://translate.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tts/, ''),
        headers: {
          'Referer': 'https://translate.google.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }
    }
  },
  optimizeDeps: {
    include: ['mermaid']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('mermaid')) return 'vendor-mermaid';
          if (id.includes('jszip') || id.includes('file-saver')) return 'vendor-zip';
          if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
        }
      }
    }
  }
})
