import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SiloTable } from './silo-table';
import { UploadPanel } from './upload-panel';
import { SiloGrid } from '../chat/silo-grid';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockCollections = [
  { id: '1', name: 'VSTEP', qdrantName: 'vstep', description: 'VSTEP info' },
  { id: '2', name: 'IELTS', qdrantName: 'ielts', description: null },
];

const mockFiles = [
  { id: 'f1', filename: 'a.md', mode: 'vstep', status: 'completed' as const, progress: 100 },
  { id: 'f2', filename: 'b.md', mode: 'vstep', status: 'completed' as const, progress: 100 },
  { id: 'f3', filename: 'c.md', mode: 'ielts', status: 'completed' as const, progress: 100 },
];

describe('SiloTable', () => {
  it('renders collections', () => {
    render(<SiloTable collections={mockCollections} files={mockFiles} onSelectSilo={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('VSTEP')).toBeInTheDocument();
    expect(screen.getByText('IELTS')).toBeInTheDocument();
  });

  it('shows file count per collection', () => {
    render(<SiloTable collections={mockCollections} files={mockFiles} onSelectSilo={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('2')).toBeInTheDocument(); // VSTEP has 2 files
    expect(screen.getByText('1')).toBeInTheDocument(); // IELTS has 1 file
  });

  it('calls onDelete when delete clicked', () => {
    const onDelete = vi.fn();
    render(<SiloTable collections={mockCollections} files={mockFiles} onSelectSilo={vi.fn()} onDelete={onDelete} />);
    const deleteBtns = screen.getAllByRole('button');
    fireEvent.click(deleteBtns[0]);
    expect(onDelete).toHaveBeenCalled();
  });

  it('shows fallback description', () => {
    render(<SiloTable collections={mockCollections} files={mockFiles} onSelectSilo={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Chưa có mô tả.')).toBeInTheDocument();
  });
});

describe('UploadPanel', () => {
  it('renders upload area', () => {
    render(<UploadPanel selectedFile={null} onFileSelect={vi.fn()} onUpload={vi.fn()} uploading={false} disabled={false} />);
    expect(screen.getByText('Nạp tri thức mới')).toBeInTheDocument();
    expect(screen.getByText('Kéo thả PDF, TXT hoặc Markdown')).toBeInTheDocument();
  });

  it('shows selected file', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    render(<UploadPanel selectedFile={file} onFileSelect={vi.fn()} onUpload={vi.fn()} uploading={false} disabled={false} />);
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    expect(screen.getByText('Xóa tệp')).toBeInTheDocument();
  });

  it('disables upload button when no file', () => {
    render(<UploadPanel selectedFile={null} onFileSelect={vi.fn()} onUpload={vi.fn()} uploading={false} disabled={false} />);
    const btn = screen.getByText('Bắt đầu xử lý').closest('button');
    expect(btn?.hasAttribute('disabled')).toBe(true);
  });

  it('shows loading state', () => {
    render(<UploadPanel selectedFile={null} onFileSelect={vi.fn()} onUpload={vi.fn()} uploading={true} disabled={false} />);
    expect(screen.getByText('Đang tải lên...')).toBeInTheDocument();
  });

  it('calls onUpload when button clicked', () => {
    const file = new File(['content'], 'test.md', { type: 'text/markdown' });
    const onUpload = vi.fn();
    render(<UploadPanel selectedFile={file} onFileSelect={vi.fn()} onUpload={onUpload} uploading={false} disabled={false} />);
    fireEvent.click(screen.getByText('Bắt đầu xử lý'));
    expect(onUpload).toHaveBeenCalled();
  });
});

describe('SiloGrid', () => {
  it('renders auto mode and collections', () => {
    render(<SiloGrid collections={mockCollections} currentMode="auto" onCollectionSelect={vi.fn()} />);
    expect(screen.getByText('Tìm kiếm tự động')).toBeInTheDocument();
    expect(screen.getByText('VSTEP')).toBeInTheDocument();
    expect(screen.getByText('IELTS')).toBeInTheDocument();
  });

  it('filters collections by search', () => {
    render(<SiloGrid collections={mockCollections} currentMode="auto" onCollectionSelect={vi.fn()} />);
    const input = screen.getByPlaceholderText('Lọc nguồn tri thức...');
    fireEvent.change(input, { target: { value: 'VSTEP' } });
    expect(screen.getByText('VSTEP')).toBeInTheDocument();
    expect(screen.queryByText('IELTS')).not.toBeInTheDocument();
  });

  it('calls onCollectionSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<SiloGrid collections={mockCollections} currentMode="auto" onCollectionSelect={onSelect} />);
    fireEvent.click(screen.getByText('VSTEP'));
    expect(onSelect).toHaveBeenCalledWith('vstep');
  });

  it('shows active state for selected collection', () => {
    render(<SiloGrid collections={mockCollections} currentMode="vstep" onCollectionSelect={vi.fn()} />);
    expect(screen.getByText('ĐANG HOẠT ĐỘNG')).toBeInTheDocument();
  });
});
