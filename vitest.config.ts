import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['{packages,apps}/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@nimo-deck/shared': path.resolve(__dirname, './packages/shared/src/index.ts'),
      '@nimo-deck/core': path.resolve(__dirname, './packages/core/src/index.ts'),
      '@nimo-deck/sync': path.resolve(__dirname, './packages/sync/src/index.ts'),
      '@nimo-deck/github': path.resolve(__dirname, './packages/github/src/index.ts'),
      '@nimo-deck/drive': path.resolve(__dirname, './packages/drive/src/index.ts'),
      '@nimo-deck/intelligence': path.resolve(__dirname, './packages/intelligence/src/index.ts'),
      '@nimo-deck/vault': path.resolve(__dirname, './packages/vault/src/index.ts'),
      '@nimo-deck/dashboard': path.resolve(__dirname, './packages/dashboard/src/index.ts')
    }
  }
});
