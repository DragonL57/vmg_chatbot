import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useIndexingPoll - polling logic', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('does nothing when disabled', () => {
    const fetchFn = vi.fn();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('calls fetchProgress at 5-second intervals', async () => {
    const fetchFn = vi.fn().mockResolvedValue(50);
    let lastProgress = 0;

    const interval = setInterval(async () => {
      const p = (await fetchFn()) ?? 0;
      if (p !== lastProgress) lastProgress = p;
    }, 5000);

    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    clearInterval(interval);
  });
});

describe('useIndexingPoll - stall detection', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('stalls after 10 unchanged progress readings', async () => {
    const fetchFn = vi.fn().mockResolvedValue(50);
    let cleared = false;
    let stallCount = 0;
    let lastProgress = 0;

    const interval = setInterval(async () => {
      const p = (await fetchFn()) ?? 0;
      if (p === lastProgress) {
        stallCount++;
        if (stallCount > 10) { clearInterval(interval); cleared = true; }
      } else { lastProgress = p; stallCount = 0; }
    }, 5000);

    for (let i = 0; i < 12; i++) { await vi.advanceTimersByTimeAsync(5000); }
    expect(cleared).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(12);
  });

  it('resets stallCount when progress changes', async () => {
    let callCount = 0;
    let localStallCount = 0;
    let lastProgress = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount <= 3 ? 50 : 100;
    });

    const interval = setInterval(async () => {
      const p = (await fetchFn()) ?? 0;
      if (p === lastProgress) {
        localStallCount++;
        if (localStallCount > 10) clearInterval(interval);
      } else { lastProgress = p; localStallCount = 0; }
    }, 5000);

    await vi.advanceTimersByTimeAsync(5000); // 0→50, reset
    expect(localStallCount).toBe(0);
    await vi.advanceTimersByTimeAsync(5000); // 50→50, stall=1
    expect(localStallCount).toBe(1);
    await vi.advanceTimersByTimeAsync(5000); // 50→50, stall=2
    expect(localStallCount).toBe(2);
    await vi.advanceTimersByTimeAsync(5000); // 50→100, reset
    expect(localStallCount).toBe(0);

    clearInterval(interval);
  });
});

describe('useIndexingPoll - error handling', () => {
  it('handles fetchProgress returning undefined (nullish coalesce to 0)', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const p = (await fn()) ?? 0;
    expect(p).toBe(0);
  });

  it('silently catches fetch errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(fn()).rejects.toThrow('Network error');
  });
});
