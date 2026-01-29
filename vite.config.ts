
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Crucial pour Hostinger (chemins relatifs)
  define: {
    // We stringify the key to ensure it's passed as a string literal to the browser
    'process.env.API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || "")
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'recharts', 'lucide-react'],
          utils: ['xlsx', 'jspdf', 'html2canvas', 'marked']
        }
      }
    }
  }
});
