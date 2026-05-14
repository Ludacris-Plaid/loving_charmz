import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Your cart is empty." />);
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(<EmptyState title="Empty" action={<button>Start shopping</button>} />);
    expect(screen.getByRole('button', { name: 'Start shopping' })).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="Just a title" />);
    expect(screen.queryByRole('paragraph')).toBeNull();
  });
});