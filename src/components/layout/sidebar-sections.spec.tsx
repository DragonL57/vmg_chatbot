import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarHeader, SidebarNav, SidebarUserWorkspace, ChatContextMenu } from './sidebar-sections';
import { Home, Settings } from 'lucide-react';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, onClick, className, 'aria-label': ariaLabel }: {
    children: React.ReactNode; href: string; onClick?: () => void; className?: string; 'aria-label'?: string;
  }) => (
    <a href={href} onClick={onClick} className={className} aria-label={ariaLabel}>{children}</a>
  ),
}));

describe('SidebarHeader', () => {
  it('renders MATE branding', () => {
    render(<SidebarHeader onClose={vi.fn()} onHomeClick={vi.fn()} />);
    expect(screen.getByText('MATE')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<SidebarHeader onClose={onClose} onHomeClick={vi.fn()} />);
    const closeBtn = screen.getByLabelText('Đóng thanh bên');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onHomeClick when home link clicked', () => {
    const onHomeClick = vi.fn();
    const onClose = vi.fn();
    render(<SidebarHeader onClose={onClose} onHomeClick={onHomeClick} />);
    const homeLink = screen.getByText('MATE').closest('a');
    if (homeLink) fireEvent.click(homeLink);
    expect(onHomeClick).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('SidebarNav', () => {
  const navItems = [
    { name: 'Trang chủ', href: '/', icon: Home },
    { name: 'Cài đặt', href: '/settings', icon: Settings },
  ];

  it('renders navigation items', () => {
    render(<SidebarNav navItems={navItems} pathname="/" currentSessionId={null} onClose={vi.fn()} />);
    expect(screen.getByText('Trang chủ')).toBeInTheDocument();
    expect(screen.getByText('Cài đặt')).toBeInTheDocument();
  });

  it('marks active item', () => {
    render(<SidebarNav navItems={navItems} pathname="/" currentSessionId={null} onClose={vi.fn()} />);
    const homeLink = screen.getByText('Trang chủ').closest('a');
    expect(homeLink?.className).toContain('bg-black');
  });

  it('calls onClose when link clicked', () => {
    const onClose = vi.fn();
    render(<SidebarNav navItems={navItems} pathname="/" currentSessionId={null} onClose={onClose} />);
    const link = screen.getByText('Cài đặt').closest('a');
    if (link) fireEvent.click(link);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('SidebarUserWorkspace', () => {
  it('renders user name and initial', () => {
    render(<SidebarUserWorkspace userName="Test User" userInitial="T" pathname="/" onClose={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('MATE Workspace')).toBeInTheDocument();
  });

  it('calls onLogout when logout button clicked', () => {
    const onLogout = vi.fn();
    render(<SidebarUserWorkspace userName="Test" userInitial="T" pathname="/" onClose={vi.fn()} onLogout={onLogout} />);
    const logoutBtn = screen.getByLabelText('Đăng xuất');
    fireEvent.click(logoutBtn);
    expect(onLogout).toHaveBeenCalled();
  });

  it('renders profile link', () => {
    render(<SidebarUserWorkspace userName="Test" userInitial="T" pathname="/" onClose={vi.fn()} onLogout={vi.fn()} />);
    const profileLink = screen.getByLabelText('Xem hồ sơ cá nhân');
    expect(profileLink).toBeInTheDocument();
  });
});

describe('ChatContextMenu', () => {
  const mockChat = { id: '1', title: 'Chat 1', isStarred: 0, updatedAt: new Date().toISOString() };
  const mockRect = { bottom: 100, right: 200, top: 80, left: 120, width: 80, height: 20, x: 120, y: 80, toJSON: () => {} } as DOMRect;

  it('renders menu items', () => {
    render(<ChatContextMenu chat={mockChat} anchorRect={mockRect} onClose={vi.fn()} onStar={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Đánh dấu sao')).toBeInTheDocument();
    expect(screen.getByText('Đổi tên')).toBeInTheDocument();
    expect(screen.getByText('Xóa')).toBeInTheDocument();
  });

  it('calls onStar when star clicked', () => {
    const onStar = vi.fn();
    render(<ChatContextMenu chat={mockChat} anchorRect={mockRect} onClose={vi.fn()} onStar={onStar} onRename={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText('Đánh dấu sao'));
    expect(onStar).toHaveBeenCalledWith('1', false);
  });

  it('calls onDelete when delete clicked', () => {
    const onDelete = vi.fn();
    render(<ChatContextMenu chat={mockChat} anchorRect={mockRect} onClose={vi.fn()} onStar={vi.fn()} onRename={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByText('Xóa'));
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('shows "Bỏ dấu sao" when already starred', () => {
    const starredChat = { ...mockChat, isStarred: 1 };
    render(<ChatContextMenu chat={starredChat} anchorRect={mockRect} onClose={vi.fn()} onStar={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Bỏ dấu sao')).toBeInTheDocument();
  });
});
