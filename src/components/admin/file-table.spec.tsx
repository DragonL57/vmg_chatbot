import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileTable } from '@/components/admin/file-table';
import type { KnowledgeFile } from '@core/application/ports/knowledge-repository.port';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockFiles: KnowledgeFile[] = [
  { id: '1', filename: 'vstep_guide.pdf', status: 'completed', mode: 'vstep', progress: 100, summary: 'VSTEP guide', createdAt: new Date() },
  { id: '2', filename: 'ielts_doc.md', status: 'indexing', mode: 'ielts', progress: 45, summary: null, createdAt: new Date() },
  { id: '3', filename: 'course.pdf', status: 'failed', mode: 'general', progress: 0, summary: null, createdAt: new Date() },
];

describe('FileTable', () => {
  it('renders file list', () => {
    render(<FileTable siloId="s1" files={mockFiles} onDelete={vi.fn()} />);
    expect(screen.getByText('vstep_guide.pdf')).toBeInTheDocument();
    expect(screen.getByText('ielts_doc.md')).toBeInTheDocument();
    expect(screen.getByText('course.pdf')).toBeInTheDocument();
  });

  it('shows indexing progress', () => {
    render(<FileTable siloId="s1" files={mockFiles} onDelete={vi.fn()} />);
    expect(screen.getByText(/Đang xử lý\.\.\. 45%/)).toBeInTheDocument();
  });

  it('shows completed status', () => {
    render(<FileTable siloId="s1" files={mockFiles} onDelete={vi.fn()} />);
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('shows failed status', () => {
    render(<FileTable siloId="s1" files={mockFiles} onDelete={vi.fn()} />);
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(<FileTable siloId="s1" files={mockFiles} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button');
    fireEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('renders empty table when no files', () => {
    render(<FileTable siloId="s1" files={[]} onDelete={vi.fn()} />);
    expect(screen.getByText('Tên tài liệu')).toBeInTheDocument();
  });
});
