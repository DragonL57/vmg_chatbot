import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminHeader } from './admin-header';

describe('AdminHeader', () => {
  const defaultProps = {
    view: 'silos' as const,
    onViewChange: vi.fn(),
    onSidebarOpen: vi.fn(),
    onSync: vi.fn(),
    onLogout: vi.fn(),
    loading: false,
  };

  it('renders silos view', () => {
    render(<AdminHeader {...defaultProps} />);
    expect(screen.getByText('Kho tri thức')).toBeInTheDocument();
    expect(screen.getByText('Làm mới')).toBeInTheDocument();
    expect(screen.getByText('Đăng xuất')).toBeInTheDocument();
  });

  it('renders files view with silo name', () => {
    render(<AdminHeader {...defaultProps} view="files" activeSiloName="VSTEP" />);
    expect(screen.getByText('VSTEP')).toBeInTheDocument();
  });

  it('calls onViewChange when silos clicked', () => {
    render(<AdminHeader {...defaultProps} view="files" />);
    fireEvent.click(screen.getByText('Kho tri thức'));
    expect(defaultProps.onViewChange).toHaveBeenCalledWith('silos');
  });

  it('calls onSync when refresh clicked', () => {
    render(<AdminHeader {...defaultProps} />);
    fireEvent.click(screen.getByText('Làm mới'));
    expect(defaultProps.onSync).toHaveBeenCalled();
  });

  it('calls onLogout when logout clicked', () => {
    render(<AdminHeader {...defaultProps} />);
    fireEvent.click(screen.getByText('Đăng xuất'));
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });

  it('shows spin animation when loading', () => {
    render(<AdminHeader {...defaultProps} loading={true} />);
    expect(screen.getByText('Làm mới')).toBeInTheDocument();
  });
});
