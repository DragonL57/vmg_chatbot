'use client';

import { useEffect } from 'react';

/**
 * Enhanced hook to handle mobile viewport height and keyboard shifts.
 * Uses the Visual Viewport API to detect exactly how much space is available
 * and where the keyboard is.
 */
export function useViewportHeight() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const setViewportStyles = () => {
      const vv = window.visualViewport;
      if (!vv) {
        // Fallback for older browsers
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        document.documentElement.style.setProperty('--vv-height', `${window.innerHeight}px`);
        document.documentElement.style.setProperty('--vv-offset', '0px');
        return;
      }

      // vh unit based on innerHeight (layout viewport)
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);

      // Real visible height (excludes keyboard)
      document.documentElement.style.setProperty('--vv-height', `${vv.height}px`);
      
      // Bottom offset (usually keyboard height or browser UI)
      // On some browsers, vv.offsetTop or the difference between innerHeight and vv.height
      const offsetBottom = window.innerHeight - vv.height - vv.offsetTop;
      document.documentElement.style.setProperty('--vv-offset', `${Math.max(0, offsetBottom)}px`);
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', setViewportStyles);
      vv.addEventListener('scroll', setViewportStyles);
    }
    
    window.addEventListener('resize', setViewportStyles);
    window.addEventListener('orientationchange', setViewportStyles);
    
    setViewportStyles();

    return () => {
      if (vv) {
        vv.removeEventListener('resize', setViewportStyles);
        vv.removeEventListener('scroll', setViewportStyles);
      }
      window.removeEventListener('resize', setViewportStyles);
      window.removeEventListener('orientationchange', setViewportStyles);
    };
  }, []);
}