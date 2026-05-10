import { useEffect } from 'react';

export function useIndexingPoll(enabled: boolean, fetchProgress: () => Promise<number | undefined>) {
  useEffect(() => {
    if (!enabled) return;
    let lastProgress = 0;
    let stallCount = 0;
    let failCount = 0;
    const interval = setInterval(async () => {
      try {
        const p = (await fetchProgress()) ?? 0;
        failCount = 0;
        if (p === lastProgress) {
          stallCount++;
          if (stallCount > 10) clearInterval(interval);
        } else {
          lastProgress = p;
          stallCount = 0;
        }
      } catch (err) {
        console.error('[useIndexingPoll] fetchProgress failed', err);
        failCount++;
        if (failCount > 5) {
          console.error('[useIndexingPoll] too many consecutive failures, stopping poll');
          clearInterval(interval);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [enabled, fetchProgress]);
}
