import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemorySection, Memory, ProfileHeader, LoadingView } from './profile-sections';
import type { User } from '@supabase/supabase-js';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img data-testid="avatar-img" src={src} alt={alt} />;
  },
}));

const mockUser: User = {
  id: 'u1',
  email: 'test@vmg.edu.vn',
  created_at: '2025-01-15T00:00:00Z',
  user_metadata: { full_name: 'Nguyễn Văn A', avatar_url: 'https://example.com/avatar.jpg' },
} as unknown as User;

const memories: Memory[] = [
  { id: 'm1', fact: 'Học sinh lớp 12 tại VMG', category: 'persona', createdAt: '2025-03-01' },
  { id: 'm2', fact: 'Thích học IELTS hơn TOEIC', category: 'preference', createdAt: '2025-03-02' },
  { id: 'm3', fact: 'Từng học tại cơ sở Bình Thạnh', category: 'episodic', createdAt: '2025-03-03' },
];

// ─── LoadingView ────────────────────────────────────────────────────────────

describe('LoadingView', () => {
  it('renders a loading indicator', () => {
    render(<LoadingView />);
    expect(screen.getByText('Đang tải...')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<LoadingView label="Đang đồng bộ..." />);
    expect(screen.getByText('Đang đồng bộ...')).toBeInTheDocument();
  });
});

// ─── ProfileHeader ──────────────────────────────────────────────────────────

describe('ProfileHeader', () => {
  it('renders user name', () => {
    render(<ProfileHeader user={mockUser} />);
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
  });

  it('renders user email', () => {
    render(<ProfileHeader user={mockUser} />);
    expect(screen.getByText('test@vmg.edu.vn')).toBeInTheDocument();
  });

  it('renders join date in Vietnamese format', () => {
    render(<ProfileHeader user={mockUser} />);
    expect(screen.getByText(/Tham gia/)).toBeInTheDocument();
  });

  it('given null user, renders fallback name', () => {
    render(<ProfileHeader user={null} />);
    expect(screen.getByText('Người dùng VMG')).toBeInTheDocument();
  });

  it('renders member badge', () => {
    render(<ProfileHeader user={mockUser} />);
    expect(screen.getByText('Thành viên')).toBeInTheDocument();
  });

  it('renders avatar image when URL present', () => {
    render(<ProfileHeader user={mockUser} />);
    expect(screen.getByAltText('Avatar')).toBeInTheDocument();
  });

  it('given user without avatar, shows placeholder icon', () => {
    render(<ProfileHeader user={{ ...mockUser, user_metadata: { full_name: 'Test' } } as unknown as User} />);
    expect(screen.queryByAltText('Avatar')).not.toBeInTheDocument();
  });
});

// ─── MemorySection ──────────────────────────────────────────────────────────

describe('MemorySection', () => {
  function renderSection(overrides: Partial<Parameters<typeof MemorySection>[0]> = {}) {
    return render(
      <MemorySection
        memories={memories}
        editingId={null}
        editValue=""
        onEditValueChange={vi.fn()}
        onStartEdit={vi.fn()}
        onSaveEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onDelete={vi.fn()}
        {...overrides}
      />,
    );
  }

  it('renders section heading', () => {
    renderSection();
    expect(screen.getByText('Tri thức MATE đã ghi nhớ')).toBeInTheDocument();
  });

  it('renders all memory facts', () => {
    renderSection();
    expect(screen.getByText('Học sinh lớp 12 tại VMG')).toBeInTheDocument();
    expect(screen.getByText('Thích học IELTS hơn TOEIC')).toBeInTheDocument();
  });

  it('renders category labels', () => {
    renderSection();
    expect(screen.getByText('cá nhân')).toBeInTheDocument();
    expect(screen.getByText('sở thích')).toBeInTheDocument();
  });

  it('renders memory count badge', () => {
    renderSection();
    expect(screen.getByText('3 bản ghi')).toBeInTheDocument();
  });

  it('shows editing input when editingId matches', () => {
    renderSection({ editingId: 'm1', editValue: 'Học sinh lớp 11' });
    expect(screen.getByDisplayValue('Học sinh lớp 11')).toBeInTheDocument();
  });

  it('given empty memories, shows placeholder', () => {
    renderSection({ memories: [] });
    expect(screen.getByText(/MATE chưa có tri thức/)).toBeInTheDocument();
  });

  it('given empty memories, shows zero count', () => {
    renderSection({ memories: [] });
    expect(screen.getByText('0 bản ghi')).toBeInTheDocument();
  });

  it('calls onStartEdit when edit button clicked', () => {
    const onStartEdit = vi.fn();
    renderSection({ onStartEdit });
    const editBtns = screen.getAllByLabelText('Chỉnh sửa tri thức');
    fireEvent.click(editBtns[0]);
    expect(onStartEdit).toHaveBeenCalledWith(memories[0]);
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    renderSection({ onDelete });
    const deleteBtns = screen.getAllByLabelText('Xóa tri thức');
    fireEvent.click(deleteBtns[0]);
    expect(onDelete).toHaveBeenCalledWith('m1');
  });

  it('calls onSaveEdit when save clicked in edit mode', () => {
    const onSaveEdit = vi.fn();
    renderSection({ editingId: 'm1', onSaveEdit });
    fireEvent.click(screen.getByLabelText('Lưu thay đổi'));
    expect(onSaveEdit).toHaveBeenCalledWith('m1');
  });

  it('calls onCancelEdit when cancel clicked in edit mode', () => {
    const onCancelEdit = vi.fn();
    renderSection({ editingId: 'm1', onCancelEdit });
    fireEvent.click(screen.getByLabelText('Hủy bỏ'));
    expect(onCancelEdit).toHaveBeenCalled();
  });
});
