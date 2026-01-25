
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Cette ligne permet d'utiliser indifféremment process.env.API_KEY 
    // ou la variable VITE_ configurée dans l'interface Hostinger
    'process.env.API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY || process.env.API_KEY)
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
