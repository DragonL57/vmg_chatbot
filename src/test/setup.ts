/**
 * Pre-import mock: replace react-dom/test-utils with a safe implementation.
 * On Vercel, react-dom/cjs/react-dom-test-utils.production.js calls React.act(callback)
 * which is undefined in React 19.2.5 production builds, crashing all component tests.
 * This mock bypasses the broken production test-utils entirely.
 * vi.mock is compiler-hoisted — it runs before any module in this file is imported.
 */

import { vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

vi.mock('react-dom/test-utils', () => ({
  act: (callback: () => unknown) => callback(),
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});
