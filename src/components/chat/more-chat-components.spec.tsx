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
  it('given plain text, renders it', () => {
    render(<MarkdownContent content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('given markdown bold syntax, renders bold text', () => {
    render(<MarkdownContent content="**bold**" />);
    expect(screen.getByText('bold')).toBeInTheDocument();
  });

  it('given user content, renders with user styling', () => {
    const { container } = render(<MarkdownContent content="User msg" isUser={true} />);
    // User messages are rendered as inline-block with text-white styling
    const markdownWrapper = container.firstChild;
    expect(markdownWrapper).toHaveClass('text-white');
  });

  it('given a markdown link, renders clickable anchor with href', () => {
    render(<MarkdownContent content="[link](https://vmg.edu.vn)" />);
    const link = screen.getByRole('link', { name: 'link' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://vmg.edu.vn');
  });

  it('given inline code syntax, renders code element', () => {
    const { container } = render(<MarkdownContent content="`code`" />);
    expect(container.querySelector('code')).toBeInTheDocument();
  });
});

describe('MessageList', () => {
  const messages = [
    { id: '1', role: 'user' as const, content: 'Hello', timestamp: new Date().toISOString() },
    { id: '2', role: 'assistant' as const, content: 'Hi!', timestamp: new Date().toISOString() },
  ];

  it('given messages, renders user and assistant content', () => {
    render(<MessageList messages={messages} isLoading={false} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi!')).toBeInTheDocument();
  });

  it('given empty messages, shows hub view', () => {
    render(<MessageList messages={[]} isLoading={false} />);
    expect(screen.getByTestId('hub-view')).toBeInTheDocument();
  });

  it('given history loading state, shows loading skeleton', () => {
    const { container } = render(<MessageList messages={[]} isLoading={false} isHistoryLoading={true} />);
    expect(container.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it('given empty messages without history loading, shows hub view', () => {
    render(<MessageList messages={[]} isLoading={false} />);
    expect(screen.getByTestId('hub-view')).toBeInTheDocument();
  });
});

describe('CreateSiloModal', () => {
  it('given no input, renders title, name field, submit and cancel buttons', () => {
    render(<CreateSiloModal name="" onNameChange={vi.fn()} qName="" onQNameChange={vi.fn()} desc="" onDescChange={vi.fn()} onSubmit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Tạo không gian mới')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ví dụ: Quy trình Du học')).toBeInTheDocument();
    expect(screen.getByText('Tạo không gian')).toBeInTheDocument();
    expect(screen.getByText('Hủy bỏ')).toBeInTheDocument();
  });

  it('given a name change handler, when user types in name field, calls handler with value', () => {
    const onChange = vi.fn();
    render(<CreateSiloModal name="" onNameChange={onChange} qName="" onQNameChange={vi.fn()} desc="" onDescChange={vi.fn()} onSubmit={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Ví dụ: Quy trình Du học'), { target: { value: 'Test' } });
    expect(onChange).toHaveBeenCalledWith('Test');
  });

  it('given a close handler, when user clicks cancel, calls onClose', () => {
    const onClose = vi.fn();
    render(<CreateSiloModal name="" onNameChange={vi.fn()} qName="" onQNameChange={vi.fn()} desc="" onDescChange={vi.fn()} onSubmit={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Hủy bỏ'));
    expect(onClose).toHaveBeenCalled();
  });

  it('given filled form, when user clicks submit, calls onSubmit', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<CreateSiloModal name="Test" onNameChange={vi.fn()} qName="test" onQNameChange={vi.fn()} desc="desc" onDescChange={vi.fn()} onSubmit={onSubmit} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Tạo không gian'));
    expect(onSubmit).toHaveBeenCalled();
  });
});
