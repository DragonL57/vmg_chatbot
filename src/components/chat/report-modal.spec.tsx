import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportModal } from './report-modal';
import { Message } from '@core/types/chat';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

global.fetch = vi.fn();

const mockMessage: Message = {
  id: 'm1', role: 'assistant', content: 'Test response',
  timestamp: new Date().toISOString(),
};

describe('ReportModal', () => {
  it('renders modal with options', () => {
    render(<ReportModal message={mockMessage} conversation={[]} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByText('Báo cáo nội dung')).toBeInTheDocument();
    expect(screen.getByText('Gửi ngay')).toBeInTheDocument();
    expect(screen.getByText('Huỷ')).toBeInTheDocument();
  });

  it('selects a problem type', () => {
    render(<ReportModal message={mockMessage} conversation={[]} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    // Click the first problem option
    fireEvent.click(buttons[1]);
    expect(screen.getByText('Gửi ngay')).not.toBeDisabled();
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn();
    render(<ReportModal message={mockMessage} conversation={[]} onClose={onClose} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByText('Huỷ'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when X clicked', () => {
    const onClose = vi.fn();
    render(<ReportModal message={mockMessage} conversation={[]} onClose={onClose} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Đóng'));
    expect(onClose).toHaveBeenCalled();
  });

  it('disables submit when no problem selected', () => {
    render(<ReportModal message={mockMessage} conversation={[]} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const submitBtn = screen.getByText('Gửi ngay');
    expect(submitBtn.closest('button')?.hasAttribute('disabled')).toBe(true);
  });

  it('submits report when form filled', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true } as Response);
    const onSuccess = vi.fn();
    render(<ReportModal message={mockMessage} conversation={[]} sessionId="s1" onClose={vi.fn()} onSuccess={onSuccess} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Select first problem
    fireEvent.click(screen.getByText('Gửi ngay'));

    await new Promise(r => setTimeout(r, 100));
    expect(global.fetch).toHaveBeenCalled();
  });
});
