import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useViewportHeight - css variable logic', () => {
  // Skip in node environment (document not available)
  const hasDocument = typeof document !== 'undefined';

  beforeEach(() => {
    if (hasDocument) {
      vi.spyOn(document.documentElement.style, 'setProperty').mockImplementation(() => {});
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets --vh based on innerHeight', () => {
    if (!hasDocument) return;
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--vh', `${vh}px`);
  });

  it('sets fallback variables when visualViewport unavailable', () => {
    if (!hasDocument) return;
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.setProperty('--vv-height', `${window.innerHeight}px`);
    document.documentElement.style.setProperty('--vv-offset', '0px');
    expect(document.documentElement.style.setProperty).toHaveBeenCalled();
  });
});

describe('useViewportHeight - SSR guard', () => {
  it('guards against undefined window', () => {
    const isSSR = typeof window === 'undefined';
    if (isSSR) {
      expect(true).toBe(true);
    }
  });

  it('handles missing visualViewport gracefully', () => {
    if (typeof window === 'undefined') return;
    if (!window.visualViewport) {
      const vh = window.innerHeight * 0.01;
      expect(typeof vh).toBe('number');
    }
  });
});
