import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentSteps } from './agent-steps';

describe('AgentSteps', () => {
  it('given thinking phase, shows thinking label', () => {
    render(<AgentSteps phase="thinking" reflections={['Query analyzed.']} />);
    expect(screen.getByText('MATE đang suy nghĩ...')).toBeInTheDocument();
  });

  it('given complete phase, shows reasoning trace label', () => {
    render(<AgentSteps phase="complete" reflections={['Query analyzed.', 'Synthesized core facts from retrieved documents.']} />);
    expect(screen.getByText('Tiến trình suy luận')).toBeInTheDocument();
  });

  it('renders all 4 step labels in timeline', () => {
    render(<AgentSteps phase="thinking" reflections={[]} />);
    expect(screen.getByText('Tóm lược hội thoại')).toBeInTheDocument();
    expect(screen.getByText('Phân tích câu hỏi')).toBeInTheDocument();
    expect(screen.getByText('Tìm kiếm tài liệu')).toBeInTheDocument();
    expect(screen.getByText('Tổng hợp câu trả lời')).toBeInTheDocument();
  });

  it('given query analyzed reflection, marks that step as done', () => {
    render(<AgentSteps phase="analyze_query" reflections={['Query analyzed.']} />);
    expect(screen.getByText('Query analyzed.')).toBeInTheDocument();
  });

  it('given retrieve trace, parses and shows file tree', () => {
    const trace = 'Searched 4 documents → Selected: du-hoc.md, vstep.md → du-hoc.md: [Intro] Giới thiệu, [FAQ] Câu hỏi thường gặp → vstep.md: [Overview] Tổng quan VSTEP';
    render(<AgentSteps phase="retrieve" reflections={[trace]} />);
    expect(screen.getByText('du-hoc.md')).toBeInTheDocument();
    expect(screen.getByText('Giới thiệu')).toBeInTheDocument();
    expect(screen.getByText('Câu hỏi thường gặp')).toBeInTheDocument();
    expect(screen.getByText('Tổng quan VSTEP')).toBeInTheDocument();
  });

  it('given retrieve trace, shows file scan count', () => {
    const trace = 'Searched 4 documents → Selected: du-hoc.md';
    render(<AgentSteps phase="retrieve" reflections={[trace]} />);
    expect(screen.getByText(/Đã quét 4 tài liệu/)).toBeInTheDocument();
  });

  it('given generate phase, shows completed label', () => {
    render(<AgentSteps phase="generate" reflections={['Synthesized core facts from retrieved documents.']} />);
    expect(screen.getByText('Tiến trình suy luận')).toBeInTheDocument();
  });

  it('given active step, shows step counter', () => {
    const { container } = render(<AgentSteps phase="analyze_query" reflections={['Query analyzed.']} />);
    expect(container.textContent).toContain('bước');
  });

  it('given retrieve with step details, shows multi-line drill-down', () => {
    const lines = ['Chọn 2/4 tài liệu', 'Đã sắp xếp 2 tài liệu', 'Lọc còn 1 tài liệu', 'Searched 4 documents'];
    const reflection = lines.join('\n');
    const { container } = render(<AgentSteps phase="retrieve" reflections={[reflection]} />);
    expect(container.textContent).toContain('Chọn 2/4 tài liệu');
    expect(container.textContent).toContain('Lọc còn 1 tài liệu');
  });

  it('given retrieve with no matching trace format, shows plain detail', () => {
    render(<AgentSteps phase="retrieve" reflections={['PageIndex tree search across all files...']} />);
    expect(screen.getByText('PageIndex tree search across all files...')).toBeInTheDocument();
  });
});
