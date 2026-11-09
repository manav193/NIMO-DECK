import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@nimo-deck/shared': path.resolve(__dirname, './packages/shared/src/index.ts'),
      '@nimo-deck/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@nimo-deck/sync': path.resolve(__dirname, './packages/sync/src/index.ts')
    }
  }
});
