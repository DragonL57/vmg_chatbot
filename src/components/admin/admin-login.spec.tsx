import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminLogin } from './admin-login';

describe('AdminLogin', () => {
  it('renders login form', () => {
    render(<AdminLogin password="" onPasswordChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText('Bảng điều khiển')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
  });

  it('calls onPasswordChange on input', () => {
    const onChange = vi.fn();
    render(<AdminLogin password="" onPasswordChange={onChange} onSubmit={vi.fn()} />);
    const input = screen.getByPlaceholderText('Mật khẩu');
    fireEvent.change(input, { target: { value: 'secret' } });
    expect(onChange).toHaveBeenCalledWith('secret');
  });

  it('calls onSubmit on form submit', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<AdminLogin password="test" onPasswordChange={vi.fn()} onSubmit={onSubmit} />);
    const btn = screen.getByText('Đăng nhập');
    fireEvent.click(btn);
    expect(onSubmit).toHaveBeenCalled();
  });
});
