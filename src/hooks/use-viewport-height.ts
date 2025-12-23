'use client';

import { useEffect } from 'react';

/**
 * Hook to handle mobile viewport height issues (the 100vh problem).
 * Sets a CSS variable --vh that can be used in styles: height: calc(var(--vh, 1vh) * 100);
 */
export function useViewportHeight() {
  useEffect(() => {
    const setHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setHeight();
    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', setHeight);

    return () => {
      window.removeEventListener('resize', setHeight);
      window.removeEventListener('orientationchange', setHeight);
    };
  }, []);
}
