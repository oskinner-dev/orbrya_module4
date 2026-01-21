import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base path for GitHub Pages
  base: '/orbrya_engine_prototype/',
  
  build: {
    outDir: 'dist',
    sourcemap: true,  // Keep sourcemaps for debugging on Chromebook
    
    // Minify but keep readable stack traces
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,  // Keep console.log for debugging
        drop_debugger: true
      },
      mangle: {
        keep_fnames: true,  // Readable function names in stack traces
        keep_classnames: true
      },
      format: {
        comments: false
      }
    },
    
    // Bundle configuration
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        test: resolve(__dirname, 'test.html')
      },
      output: {
        // Chunk strategy for caching
        manualChunks: {
          three: ['three'],
          engine: [
            './src/engine/SceneController.js',
            './src/engine/AssetLoader.js'
          ],
          ui: [
            './src/ui/PanelManager.js',
            './src/ui/VisualProfiler.js',
            './src/ui/CodeEditor.js',
            './src/ui/Hierarchy.js'
          ]
        }
      }
    },
    
    // Target modern browsers (Chromebook Chrome 90+)
    target: 'es2020',
    
    // Chunk size warnings
    chunkSizeWarningLimit: 500
  },
  
  // Dev server
  server: {
    port: 3000,
    open: true
  },
  
  // Optimize deps
  optimizeDeps: {
    include: ['three']
  }
});
