import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  resolve: {
    alias: {
      'node:crypto': path.resolve(__dirname, 'src/renderer/shims/crypto.ts'),
      '@nimo-deck/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@nimo-deck/dashboard/theme.css': path.resolve(__dirname, '../../packages/dashboard/src/styles/theme.css'),
      '@nimo-deck/dashboard': path.resolve(__dirname, '../../packages/dashboard/src/index.ts')
    }
  }
});
