import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import * as React from 'react';

// Polyfill React.act for react-dom/test-utils compatibility with @testing-library/react@16.
// On Vercel, react-dom/cjs/react-dom-test-utils.production.js expects React.act to be a
// function, but React 19.2.5 may not attach act to the namespace object in production builds.
if (typeof React.act !== 'function') {
  (React as unknown as Record<string, unknown>).act = (callback: () => unknown) => callback();
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});
