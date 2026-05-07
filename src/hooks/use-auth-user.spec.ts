import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuthUser } from './use-auth-user';

vi.mock('@/core/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@vmg.edu.vn' } } }),
    },
  },
}));

describe('useAuthUser', () => {
  it('returns user after auth check', async () => {
    const { result } = renderHook(() => useAuthUser());

    // Initially null while loading
    expect(result.current).toBeNull();

    // After promise resolves
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.email).toBe('test@vmg.edu.vn');
  });

  it('returns null when no user', async () => {
    const { supabase } = await import('@/core/lib/supabase');
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: null }, error: null } as never);

    const { result } = renderHook(() => useAuthUser());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });
});
