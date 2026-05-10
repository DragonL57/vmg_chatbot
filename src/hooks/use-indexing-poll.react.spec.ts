import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIndexingPoll } from './use-indexing-poll';

describe('useIndexingPoll with React Testing Library', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('does not call fetch when disabled', () => {
    const fetchFn = vi.fn().mockResolvedValue(50);
    renderHook(() => useIndexingPoll(false, fetchFn));
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('calls fetch at intervals when enabled', async () => {
    const fetchFn = vi.fn().mockResolvedValue(50);
    renderHook(() => useIndexingPoll(true, fetchFn));

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('clears interval on unmount', async () => {
    const fetchFn = vi.fn().mockResolvedValue(50);
    const { unmount } = renderHook(() => useIndexingPoll(true, fetchFn));

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    unmount();

    await vi.advanceTimersByTimeAsync(5000);
    // Should not increase after unmount
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
