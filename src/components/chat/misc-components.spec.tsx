import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HubHeader } from './hub-header';
import { HubSkeleton } from './hub-skeleton';
import { QuickActions } from './quick-actions';
import { Tooltip } from '../ui/tooltip';

describe('HubHeader', () => {
  it('given the hub header, renders title and subtitle', () => {
    render(<HubHeader />);
    expect(screen.getByText('Hệ thống tri thức')).toBeInTheDocument();
    expect(screen.getByText('Chọn một không gian để bắt đầu trò chuyện.')).toBeInTheDocument();
  });
});

describe('HubSkeleton', () => {
  it('given the skeleton, renders six card placeholders in a grid', () => {
    const { container } = render(<HubSkeleton />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid!.children).toHaveLength(6);
  });
});

describe('QuickActions', () => {
  it('given quick actions, renders all suggestion buttons', () => {
    render(<QuickActions />);
    expect(screen.getByText('Singapore Program')).toBeInTheDocument();
    expect(screen.getByText('E-Plus Online')).toBeInTheDocument();
    expect(screen.getByText('Placement Process')).toBeInTheDocument();
    expect(screen.getByText('Summer 2026')).toBeInTheDocument();
  });

  it('given a click handler, when user clicks a suggestion, calls it with label', () => {
    const onClick = vi.fn();
    render(<QuickActions onSuggestionClick={onClick} />);
    fireEvent.click(screen.getByText('Singapore Program'));
    expect(onClick).toHaveBeenCalledWith('Singapore Program');
  });
});

describe('Tooltip', () => {
  it('given the tooltip, renders its trigger children', () => {
    render(<Tooltip content="Tooltip text"><button>Hover me</button></Tooltip>);
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('given a trigger, when user hovers, shows the tooltip', () => {
    render(<Tooltip content="Tooltip text"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('Hover me'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tooltip text');
  });

  it('given a visible tooltip, when user stops hovering, hides the tooltip', () => {
    render(<Tooltip content="Tooltip text"><button>Hover me</button></Tooltip>);
    const btn = screen.getByText('Hover me');
    fireEvent.mouseEnter(btn);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(btn);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
