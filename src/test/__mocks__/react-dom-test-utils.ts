/**
 * Mock for react-dom/test-utils that replaces the production build's broken `act`.
 *
 * On Vercel, react-dom resolves to the CJS production bundle where
 * react-dom/cjs/react-dom-test-utils.production.js calls React.act(callback)
 * but React 19.2.5 production builds do not attach `act` to the namespace.
 *
 * This mock imports the real module and patches `act` to use React's own
 * `act` export (available in the ESM development build that vitest bundles).
 */
import * as React from 'react';

// Re-export everything from the original module
export * from 'react-dom/test-utils';

// Override act with React.act (works in vitest's bundled ESM environment)
// Falls back to a simple callback wrapper if React.act is somehow unavailable.
const safeAct: typeof React.act =
  typeof React.act === 'function'
    ? React.act
    : ((callback: () => void) => { callback(); }) as unknown as typeof React.act;

export { safeAct as act };
