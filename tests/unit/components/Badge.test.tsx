import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Featured</Badge>);
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('applies default soft variant', () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('badge-soft');
  });

  it('applies mint variant', () => {
    render(<Badge variant="mint" data-testid="badge">Mint</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('badge-mint');
  });

  it('applies success variant', () => {
    render(<Badge variant="success" data-testid="badge">Success</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('bg-mint-200');
  });

  it('applies warning variant', () => {
    render(<Badge variant="warning" data-testid="badge">Warning</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('bg-amber-50');
  });

  it('applies danger variant', () => {
    render(<Badge variant="danger" data-testid="badge">Danger</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('bg-red-50');
  });
});
