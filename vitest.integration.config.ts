import { defineConfig } from 'vitest/config';
import path from 'path';

// Load env.local for integration tests
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

/**
 * Integration test config — runs in node environment (not jsdom).
 * This allows server env vars, OpenAI SDK, and real API calls.
 */
export default defineConfig({
  test: {
    name: 'integration',
    environment: 'node',
    globals: true,
    include: ['src/**/*.integration.spec.ts'],
    exclude: ['node_modules', '.next'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/core/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.integration.spec.ts', '**/*.test.ts'],
    },
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
