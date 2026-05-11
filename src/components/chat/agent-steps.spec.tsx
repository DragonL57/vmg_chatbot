import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentSteps } from './agent-steps';

describe('AgentSteps', () => {
  it('given thinking phase, shows thinking label', () => {
    render(<AgentSteps phase="thinking" reflections={['Query analyzed.']} />);
    expect(screen.getByText('MATE đang suy nghĩ...')).toBeInTheDocument();
  });

  it('given complete phase, shows reasoning trace label', () => {
    render(<AgentSteps phase="complete" reflections={['Done']} />);
    expect(screen.getByText('Tiến trình suy luận')).toBeInTheDocument();
  });

  it('renders trace lines from reflections', () => {
    render(<AgentSteps phase="thinking" reflections={['Phân tích câu hỏi...', 'du-hoc.md', '  Chương trình Philippines', '  Học bổng']} />);
    expect(screen.getByText('Phân tích câu hỏi...')).toBeInTheDocument();
    expect(screen.getByText('du-hoc.md')).toBeInTheDocument();
    expect(screen.getByText('Chương trình Philippines')).toBeInTheDocument();
  });

  it('renders file names with file icon and bold style', () => {
    render(<AgentSteps phase="thinking" reflections={['vstep.md']} />);
    const fileNode = screen.getByText('vstep.md');
    expect(fileNode).toBeInTheDocument();
    expect(fileNode.className).toContain('font-semibold');
  });

  it('indents subordinate lines', () => {
    render(<AgentSteps phase="thinking" reflections={['file.md', '  Section A']} />);
    const section = screen.getByText('Section A');
    expect(section.style.paddingLeft).toBe('12px');
  });

  it('handles multi-line reflections', () => {
    const reflection = 'du-hoc.md\n  Philippines\n  Singapore\nvstep.md\n  Tổng quan';
    render(<AgentSteps phase="thinking" reflections={[reflection]} />);
    expect(screen.getByText('Philippines')).toBeInTheDocument();
    expect(screen.getByText('Singapore')).toBeInTheDocument();
  });
});
