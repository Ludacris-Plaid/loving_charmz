import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Card content</p></Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default padding (md = p-6)', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('p-6');
  });

  it('applies custom padding size', () => {
    render(<Card padding="sm" data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('p-4');
  });

  it('applies card elevation by default', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('surface-card');
  });

  it('accepts additional className', () => {
    render(<Card className="custom-card" data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('custom-card');
  });
});
