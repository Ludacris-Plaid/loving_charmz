import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton, SkeletonLine, SkeletonCard } from '@/components/ui/Skeleton';

describe('Skeleton', () => {
  it('renders with shimmer animation class', () => {
    render(<Skeleton data-testid="skeleton" />);
    const el = screen.getByTestId('skeleton');
    expect(el.className).toContain('skeleton');
  });

  it('accepts className', () => {
    render(<Skeleton className="h-32 w-full" data-testid="skeleton" />);
    const el = screen.getByTestId('skeleton');
    expect(el.className).toContain('h-32');
    expect(el.className).toContain('w-full');
  });
});

describe('SkeletonLine', () => {
  it('renders a line skeleton', () => {
    render(<SkeletonLine data-testid="line" />);
    const el = screen.getByTestId('line');
    expect(el.className).toContain('h-4');
  });
});

describe('SkeletonCard', () => {
  it('renders a card skeleton with image and text lines', () => {
    const { container } = render(<SkeletonCard />);
    const children = container.querySelectorAll('[class*="skeleton"]');
    expect(children.length).toBeGreaterThanOrEqual(3);
  });
});
