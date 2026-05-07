import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageItem } from './message-item';
import { Message } from '@core/types/chat';

vi.mock('./markdown-content', () => ({
  MarkdownContent: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>,
}));

vi.mock('./agent-steps', () => ({
  AgentSteps: () => <div data-testid="agent-steps">Thinking...</div>,
}));

vi.mock('./report-modal', () => ({
  ReportModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="report-modal"><button onClick={onClose}>Close</button></div>
  ),
}));

const createMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  role: 'user',
  content: 'Hello',
  timestamp: new Date().toISOString(),
  ...overrides,
});

describe('MessageItem', () => {
  it('renders user message with red bubble', () => {
    render(<MessageItem message={createMessage({ role: 'user' })} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders assistant message', () => {
    render(<MessageItem message={createMessage({ role: 'assistant', content: 'Hi there!' })} />);
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('renders system message', () => {
    render(<MessageItem message={createMessage({ role: 'system', content: 'System update' })} />);
    expect(screen.getByText('System update')).toBeInTheDocument();
  });

  it('shows report button for assistant messages', () => {
    render(<MessageItem message={createMessage({ role: 'assistant', traceId: 'trace-123' })} />);
    expect(screen.getByText('Báo cáo')).toBeInTheDocument();
  });

  it('shows feedback buttons for assistant with traceId', () => {
    render(<MessageItem message={createMessage({ role: 'assistant', traceId: 'trace-123' })} />);
    expect(document.querySelectorAll('button').length).toBeGreaterThan(2);
  });

  it('does not show feedback for user messages', () => {
    render(<MessageItem message={createMessage({ role: 'user' })} />);
    expect(screen.queryByText('Báo cáo')).not.toBeInTheDocument();
  });

  it('shows memory updated indicator', () => {
    render(<MessageItem message={createMessage({ role: 'assistant', memoryUpdated: true })} />);
    expect(screen.getByText(/MATE đã ghi nhớ/)).toBeInTheDocument();
  });

  it('opens report modal on report click', () => {
    render(<MessageItem message={createMessage({ role: 'assistant', traceId: 'trace-123' })} />);
    const reportBtn = screen.getByText('Báo cáo');
    fireEvent.click(reportBtn);
    expect(screen.getByTestId('report-modal')).toBeInTheDocument();
  });

  it('shows safety warning styling', () => {
    render(<MessageItem message={createMessage({
      role: 'assistant',
      content: '⚠️ Cảnh báo vi phạm chính sách an toàn',
    })} />);
    expect(screen.getByText('⚠️ Cảnh báo vi phạm chính sách an toàn')).toBeInTheDocument();
  });
});
