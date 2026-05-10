import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './chat-input';

describe('ChatInput', () => {
  const mockSubmit = vi.fn((e) => e.preventDefault());
  const mockChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders textarea with placeholder', () => {
    render(<ChatInput input="" handleInputChange={mockChange} handleSubmit={mockSubmit} isLoading={false} />);
    expect(screen.getByPlaceholderText('Nhập câu hỏi của bạn...')).toBeInTheDocument();
  });

  it('calls handleInputChange on type', () => {
    render(<ChatInput input="" handleInputChange={mockChange} handleSubmit={mockSubmit} isLoading={false} />);
    const textarea = screen.getByPlaceholderText('Nhập câu hỏi của bạn...');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(mockChange).toHaveBeenCalled();
  });

  it('disables submit when input is empty', () => {
    render(<ChatInput input="" handleInputChange={mockChange} handleSubmit={mockSubmit} isLoading={false} />);
    const submitBtn = screen.getByLabelText('Gửi tin nhắn');
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit when input has text', () => {
    render(<ChatInput input="Hello" handleInputChange={mockChange} handleSubmit={mockSubmit} isLoading={false} />);
    const submitBtn = screen.getByLabelText('Gửi tin nhắn');
    expect(submitBtn).not.toBeDisabled();
  });

  it('disables textarea when loading', () => {
    render(<ChatInput input="Hello" handleInputChange={mockChange} handleSubmit={mockSubmit} isLoading={true} />);
    const textarea = screen.getByPlaceholderText('Nhập câu hỏi của bạn...');
    expect(textarea).toBeDisabled();
  });

  it('disables submit when loading', () => {
    render(<ChatInput input="Hello" handleInputChange={mockChange} handleSubmit={mockSubmit} isLoading={true} />);
    const submitBtn = screen.getByLabelText('Gửi tin nhắn');
    expect(submitBtn).toBeDisabled();
  });

  it('has attach button with aria-label', () => {
    render(<ChatInput input="" handleInputChange={mockChange} handleSubmit={mockSubmit} isLoading={false} />);
    expect(screen.getByLabelText('Đính kèm tài liệu')).toBeInTheDocument();
  });

  it('submits form on button click', () => {
    render(<ChatInput input="Hello" handleInputChange={mockChange} handleSubmit={mockSubmit} isLoading={false} />);
    const submitBtn = screen.getByLabelText('Gửi tin nhắn');
    fireEvent.click(submitBtn);
    expect(mockSubmit).toHaveBeenCalled();
  });
});
