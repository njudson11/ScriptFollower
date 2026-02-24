import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/audio-proxy': {
        target: 'https://www.soundhelix.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/audio-proxy/, '')
      }
    }
  }
})
