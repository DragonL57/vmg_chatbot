import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginButton } from './login-button';

vi.mock('@/core/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('LoginButton', () => {
  it('renders Google login button', () => {
    render(<LoginButton />);
    expect(screen.getByText('Đăng nhập với Google')).toBeInTheDocument();
  });

  it('calls signInWithOAuth on click', async () => {
    const { supabase } = await import('@/core/lib/supabase');
    render(<LoginButton />);
    fireEvent.click(screen.getByText('Đăng nhập với Google'));
    // Wait for async
    await new Promise(r => setTimeout(r, 100));
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalled();
  });
});
