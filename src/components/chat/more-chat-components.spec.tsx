import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownContent } from './markdown-content';
import { MessageList } from './message-list';
import { CreateSiloModal } from '../admin/create-silo-modal';

vi.mock('./message-item', () => ({
  MessageItem: ({ message }: { message: { content: string } }) => <div>{message.content}</div>,
}));

vi.mock('./hub-view', () => ({
  HubView: () => <div data-testid="hub-view">Hub View</div>,
}));

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

describe('MarkdownContent', () => {
  it('renders plain text', () => {
    render(<MarkdownContent content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders markdown bold', () => {
    render(<MarkdownContent content="**bold**" />);
    expect(screen.getByText('bold')).toBeInTheDocument();
  });

  it('renders user content with white text class', () => {
    const { container } = render(<MarkdownContent content="User msg" isUser={true} />);
    expect(container.querySelector('.text-white')).toBeInTheDocument();
  });

  it('renders links', () => {
    render(<MarkdownContent content="[link](https://vmg.edu.vn)" />);
    const link = document.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link?.getAttribute('href')).toBe('https://vmg.edu.vn');
  });

  it('renders code blocks', () => {
    render(<MarkdownContent content="`code`" />);
    expect(document.querySelector('code')).toBeInTheDocument();
  });
});

describe('MessageList', () => {
  const messages = [
    { id: '1', role: 'user' as const, content: 'Hello', timestamp: new Date().toISOString() },
    { id: '2', role: 'assistant' as const, content: 'Hi!', timestamp: new Date().toISOString() },
  ];

  it('renders messages', () => {
    render(<MessageList messages={messages} isLoading={false} />);
    expect(document.body.textContent).toContain('Hello');
    expect(document.body.textContent).toContain('Hi!');
  });

  it('shows hub view when no messages', () => {
    render(<MessageList messages={[]} isLoading={false} collections={[]} />);
    expect(screen.getByTestId('hub-view')).toBeInTheDocument();
  });

  it('shows loading skeleton when history loading', () => {
    render(<MessageList messages={[]} isLoading={false} isHistoryLoading={true} />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders empty without crashing', () => {
    render(<MessageList messages={[]} isLoading={false} />);
    expect(screen.getByTestId('hub-view')).toBeInTheDocument();
  });
});

describe('CreateSiloModal', () => {
  it('renders form fields', () => {
    render(<CreateSiloModal name="" onNameChange={vi.fn()} qName="" onQNameChange={vi.fn()} desc="" onDescChange={vi.fn()} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Tạo không gian mới')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ví dụ: Quy trình Du học')).toBeInTheDocument();
    expect(screen.getByText('Tạo không gian')).toBeInTheDocument();
    expect(screen.getByText('Hủy bỏ')).toBeInTheDocument();
  });

  it('calls onNameChange when typing', () => {
    const onChange = vi.fn();
    render(<CreateSiloModal name="" onNameChange={onChange} qName="" onQNameChange={vi.fn()} desc="" onDescChange={vi.fn()} onSubmit={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Ví dụ: Quy trình Du học'), { target: { value: 'Test' } });
    expect(onChange).toHaveBeenCalledWith('Test');
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn();
    render(<CreateSiloModal name="" onNameChange={vi.fn()} qName="" onQNameChange={vi.fn()} desc="" onDescChange={vi.fn()} onSubmit={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Hủy bỏ'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSubmit when form submitted', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<CreateSiloModal name="Test" onNameChange={vi.fn()} qName="test" onQNameChange={vi.fn()} desc="desc" onDescChange={vi.fn()} onSubmit={onSubmit} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Tạo không gian'));
    expect(onSubmit).toHaveBeenCalled();
  });
});
