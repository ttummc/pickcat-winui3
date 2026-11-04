import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Builds the landing page into docs/ so GitHub Pages (main → /docs) serves it.
// emptyOutDir is false on purpose: docs/ also holds the screenshots and promo art.
export default defineConfig({
  plugins: [vue()],
  base: '/pickcat-winui3/',
  build: {
    outDir: '../docs',
    emptyOutDir: false,
    target: 'chrome100',
    assetsDir: 'site-assets',
  },
})
