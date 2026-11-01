import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

// Builds a single self-contained IIFE content script + one CSS file.
export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': '"production"',
    __VUE_OPTIONS_API__: 'true',
    __VUE_PROD_DEVTOOLS__: 'false',
  },
  resolve: {
    alias: { '@': resolve(process.cwd(), 'src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome114',
    minify: 'esbuild',
    cssCodeSplit: false,
    lib: {
      entry: resolve(process.cwd(), 'src/content.ts'),
      name: 'PickCatWinUI',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (asset) => (asset.names?.some((n) => n.endsWith('.css')) ? 'content.css' : 'assets/[name][extname]'),
        inlineDynamicImports: true,
      },
    },
  },
})
