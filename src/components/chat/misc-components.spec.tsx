import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HubHeader } from './hub-header';
import { HubSkeleton } from './hub-skeleton';
import { QuickActions } from './quick-actions';
import { Tooltip } from '../ui/tooltip';

describe('HubHeader', () => {
  it('renders header text', () => {
    render(<HubHeader />);
    expect(screen.getByText('Hệ thống tri thức')).toBeInTheDocument();
    expect(screen.getByText('Chọn một không gian để bắt đầu trò chuyện.')).toBeInTheDocument();
  });
});

describe('HubSkeleton', () => {
  it('renders skeleton placeholders', () => {
    render(<HubSkeleton />);
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(document.querySelectorAll('.h-32').length).toBe(6);
  });
});

describe('QuickActions', () => {
  it('renders all suggestions', () => {
    render(<QuickActions />);
    expect(screen.getByText('Singapore Program')).toBeInTheDocument();
    expect(screen.getByText('E-Plus Online')).toBeInTheDocument();
    expect(screen.getByText('Placement Process')).toBeInTheDocument();
    expect(screen.getByText('Summer 2026')).toBeInTheDocument();
  });

  it('calls onSuggestionClick when clicked', () => {
    const onClick = vi.fn();
    render(<QuickActions onSuggestionClick={onClick} />);
    fireEvent.click(screen.getByText('Singapore Program'));
    expect(onClick).toHaveBeenCalledWith('Singapore Program');
  });
});

describe('Tooltip', () => {
  it('renders children', () => {
    render(<Tooltip content="Tooltip text"><button>Hover me</button></Tooltip>);
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('shows tooltip on hover', () => {
    render(<Tooltip content="Tooltip text"><button>Hover me</button></Tooltip>);
    const btn = screen.getByText('Hover me');
    fireEvent.mouseEnter(btn);
    // Tooltip is rendered via portal, check for it
    expect(document.body.textContent).toContain('Tooltip text');
  });

  it('hides tooltip on mouse leave', () => {
    render(<Tooltip content="Tooltip text"><button>Hover me</button></Tooltip>);
    const btn = screen.getByText('Hover me');
    fireEvent.mouseEnter(btn);
    fireEvent.mouseLeave(btn);
    // After mouse leave, tooltip should be gone
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
