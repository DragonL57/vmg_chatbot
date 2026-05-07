import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentSteps } from './agent-steps';

describe('AgentSteps', () => {
  it('given thinking phase, shows thinking label', () => {
    render(<AgentSteps phase="thinking" reflections={['Analyzing query...']} />);
    expect(screen.getByText('MATE đang suy nghĩ...')).toBeInTheDocument();
  });

  it('given complete phase, shows reasoning trace label', () => {
    render(<AgentSteps phase="complete" reflections={['Done']} />);
    expect(screen.getByText('Tiến trình suy luận')).toBeInTheDocument();
  });

  it('given reflections, renders each step text', () => {
    render(<AgentSteps phase="thinking" reflections={['Step 1', 'Step 2']} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
  });

  it('given auto-collapsed complete phase, when user clicks label, expands to show reflections', () => {
    render(<AgentSteps phase="complete" reflections={['Done']} />);
    const btn = screen.getByText('Tiến trình suy luận').closest('button');
    if (btn) fireEvent.click(btn);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('given thinking phase with no reflections, shows initializing fallback text', () => {
    render(<AgentSteps phase="thinking" reflections={[]} />);
    expect(screen.getByText('Đang khởi tạo chuỗi suy luận...')).toBeInTheDocument();
  });

  it('given thinking phase, does not show completed label', () => {
    render(<AgentSteps phase="thinking" reflections={[]} />);
    expect(screen.queryByText('Tiến trình suy luận')).not.toBeInTheDocument();
  });
});
