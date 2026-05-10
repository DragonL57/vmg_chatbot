import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarHistory } from './sidebar-history';
import type { ChatHistory } from './sidebar-sections';

vi.mock('./sidebar-sections', () => ({
  ChatContextMenu: ({ chat, onClose, onStar, onRename, onDelete }: {
    chat: ChatHistory; onClose: () => void; onStar: (id: string, s: boolean) => void;
    onRename: (c: ChatHistory) => void; onDelete: (id: string) => void;
  }) => (
    <div data-testid="context-menu">
      <button data-testid="menu-close" onClick={onClose}>Close</button>
      <button data-testid="menu-star" onClick={() => onStar(chat.id, chat.isStarred === 0)}>Star</button>
      <button data-testid="menu-rename" onClick={() => onRename(chat)}>Rename</button>
      <button data-testid="menu-delete" onClick={() => onDelete(chat.id)}>Delete</button>
    </div>
  ),
}));

const chatList: ChatHistory[] = [
  { id: 'c1', title: 'Hỏi về VSTEP', isStarred: 0, updatedAt: new Date().toISOString() },
  { id: 'c2', title: 'Luyện IELTS', isStarred: 1, updatedAt: new Date().toISOString() },
];

function renderSidebar(overrides: Partial<Parameters<typeof SidebarHistory>[0]> = {}) {
  return render(
    <SidebarHistory
      history={chatList}
      isLoading={false}
      editingId={null}
      editTitle=""
      isRenaming={false}
      currentSessionId={null}
      activeMenuId={null}
      menuAnchor={null}
      onEditTitleChange={vi.fn()}
      onKeyDown={vi.fn()}
      onSubmitRename={vi.fn()}
      onStartRename={vi.fn()}
      onMenuClick={vi.fn()}
      onSelectChat={vi.fn()}
      onCloseMenu={vi.fn()}
      onStar={vi.fn()}
      onDelete={vi.fn()}
      {...overrides}
    />,
  );
}

describe('SidebarHistory', () => {
  it('renders history section heading', () => {
    renderSidebar();
    expect(screen.getByText('Gần đây')).toBeInTheDocument();
  });

  it('given loading, shows skeleton', () => {
    renderSidebar({ isLoading: true });
    expect(screen.queryByText('Hỏi về VSTEP')).not.toBeInTheDocument();
  });

  it('given empty history, shows placeholder', () => {
    renderSidebar({ history: [] });
    expect(screen.getByText('Chưa có hội thoại nào')).toBeInTheDocument();
  });

  it('renders chat titles from history', () => {
    renderSidebar();
    expect(screen.getByText('Hỏi về VSTEP')).toBeInTheDocument();
    expect(screen.getByText('Luyện IELTS')).toBeInTheDocument();
  });

  it('given active session, highlights that chat', () => {
    renderSidebar({ currentSessionId: 'c1' });
    const btn = screen.getByText('Hỏi về VSTEP').closest('button');
    expect(btn?.className).toContain('font-semibold');
  });

  it('given non-active chat, does not highlight it', () => {
    renderSidebar({ currentSessionId: 'c2' });
    const btn = screen.getByText('Hỏi về VSTEP').closest('button');
    expect(btn?.className).not.toContain('font-semibold');
  });

  it('given editingId matching a chat, shows edit input', () => {
    renderSidebar({ editingId: 'c1', editTitle: 'Renamed Chat' });
    const input = screen.getByDisplayValue('Renamed Chat');
    expect(input).toBeInTheDocument();
    expect(screen.getByLabelText('Lưu tên mới')).toBeInTheDocument();
  });

  it('given editing active, shows edit input instead of row title', () => {
    renderSidebar({ editingId: 'c1' });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('given onSelectChat callback, clicking a chat calls it', () => {
    const onSelect = vi.fn();
    renderSidebar({ onSelectChat: onSelect });
    fireEvent.click(screen.getByText('Hỏi về VSTEP'));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('given onMenuClick callback, clicking menu button calls it', () => {
    const onMenuClick = vi.fn();
    renderSidebar({ onMenuClick });
    const menuBtns = screen.getAllByLabelText('Menu thao tác');
    fireEvent.click(menuBtns[0]);
    expect(onMenuClick).toHaveBeenCalledWith(expect.any(Object), 'c1');
  });

  it('given activeMenuId and anchor, renders context menu', () => {
    const anchor = { left: 0, right: 100, top: 0, bottom: 20, width: 100, height: 20, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    renderSidebar({ activeMenuId: 'c1', menuAnchor: anchor });
    expect(screen.getByTestId('context-menu')).toBeInTheDocument();
  });

  it('given no activeMenuId, does not render context menu', () => {
    renderSidebar({ activeMenuId: null });
    expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument();
  });

  it('given starred chat, verifies it is present in the list', () => {
    renderSidebar();
    expect(screen.getByText('Luyện IELTS')).toBeInTheDocument();
  });
});
