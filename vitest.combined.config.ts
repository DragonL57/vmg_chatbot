import { defineConfig } from 'vitest/config';
import path from 'path';

// Load env.local for integration tests
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default defineConfig({
  test: {
    name: 'combined',
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules', '.next', 'src/hooks/use-viewport-height.spec.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/core/**/*.ts', 'src/hooks/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.test.ts'],
    },
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
