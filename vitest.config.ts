import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_KEY: 'sb_test_key',
    },
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      'react-dom/test-utils': path.resolve(__dirname, './src/test/__mocks__/react-dom-test-utils.ts'),
    },
    exclude: ['**/*.integration.spec.ts', 'node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/core/domain/**',
        'src/core/application/**',
        'src/core/lib/**',
        'src/core/agent/**',
        'src/hooks/**',
        'src/components/**',
        'src/app/api/**',
      ],
      exclude: ['**/*.spec.ts', '**/*.test.ts', '**/*.integration.spec.ts'],
    },
  },
});
