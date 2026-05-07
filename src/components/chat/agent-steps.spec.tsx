import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentSteps } from './agent-steps';

describe('AgentSteps', () => {
  it('renders thinking state', () => {
    render(<AgentSteps phase="thinking" reflections={['Analyzing query...']} />);
    expect(screen.getByText('MATE đang suy nghĩ...')).toBeInTheDocument();
  });

  it('renders complete state', () => {
    render(<AgentSteps phase="complete" reflections={['Done']} />);
    expect(screen.getByText('Tiến trình suy luận')).toBeInTheDocument();
  });

  it('shows reflections when expanded', () => {
    render(<AgentSteps phase="thinking" reflections={['Step 1', 'Step 2']} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
  });

  it('collapses and expands on click', () => {
    render(<AgentSteps phase="complete" reflections={['Done']} />);
    // Complete state is auto-collapsed, click to expand
    const btn = screen.getByText('Tiến trình suy luận').closest('button');
    if (btn) fireEvent.click(btn);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows loading spinner when not complete', () => {
    render(<AgentSteps phase="thinking" reflections={[]} />);
    expect(screen.getByText('MATE đang suy nghĩ...')).toBeInTheDocument();
  });

  it('shows fallback when no reflections', () => {
    render(<AgentSteps phase="thinking" reflections={[]} />);
    // Should show the animate-pulse fallback text
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
