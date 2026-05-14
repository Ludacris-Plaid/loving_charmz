import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Featured</Badge>);
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('bg-brand-300');
    expect(badge.className).toContain('text-brand-700');
  });

  it('applies brand variant', () => {
    render(<Badge variant="brand" data-testid="badge">Brand</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('bg-brand-500');
    expect(badge.className).toContain('text-white');
  });

  it('applies success variant', () => {
    render(<Badge variant="success" data-testid="badge">Success</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('bg-green-100');
  });

  it('applies warning variant', () => {
    render(<Badge variant="warning" data-testid="badge">Warning</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('bg-amber-100');
  });
});