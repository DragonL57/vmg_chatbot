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
  timestamp: new Date(),
  ...overrides,
});

describe('MessageItem', () => {
  it('given a user message, renders its content', () => {
    render(<MessageItem message={createMessage({ role: 'user' })} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('given an assistant message, renders its content', () => {
    render(<MessageItem message={createMessage({ role: 'assistant', content: 'Hi there!' })} />);
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('given a system message, renders its content', () => {
    render(<MessageItem message={createMessage({ role: 'system', content: 'System update' })} />);
    expect(screen.getByText('System update')).toBeInTheDocument();
  });

  it('given an assistant message, shows the report button', () => {
    render(<MessageItem message={createMessage({ role: 'assistant', traceId: 'trace-123' })} />);
    expect(screen.getByText('Báo cáo')).toBeInTheDocument();
  });

  it('given an assistant message with traceId, shows trace prefix as feedback row', () => {
    render(<MessageItem message={createMessage({ role: 'assistant', traceId: 'trace-123' })} />);
    expect(screen.getByText('trace')).toBeInTheDocument();
  });

  it('given a user message, does not show report button', () => {
    render(<MessageItem message={createMessage({ role: 'user' })} />);
    expect(screen.queryByText('Báo cáo')).not.toBeInTheDocument();
  });

  it('given an assistant message with memoryUpdated flag, shows memory indicator', () => {
    render(<MessageItem message={createMessage({ role: 'assistant', memoryUpdated: true })} />);
    expect(screen.getByText(/MATE đã ghi nhớ/)).toBeInTheDocument();
  });

  it('given an assistant message, when user clicks report, opens the report modal', () => {
    render(<MessageItem message={createMessage({ role: 'assistant', traceId: 'trace-123' })} />);
    fireEvent.click(screen.getByText('Báo cáo'));
    expect(screen.getByTestId('report-modal')).toBeInTheDocument();
  });

  it('given an assistant message with safety warning content, renders the warning text', () => {
    render(<MessageItem message={createMessage({
      role: 'assistant',
      content: '⚠️ Cảnh báo vi phạm chính sách an toàn',
    })} />);
    expect(screen.getByText('⚠️ Cảnh báo vi phạm chính sách an toàn')).toBeInTheDocument();
  });
});
