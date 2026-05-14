import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Container } from '@/components/ui/Container';

describe('Container', () => {
  it('renders children', () => {
    render(<Container><p>Container content</p></Container>);
    expect(screen.getByText('Container content')).toBeInTheDocument();
  });

  it('applies default max-width', () => {
    render(<Container data-testid="container">Content</Container>);
    const el = screen.getByTestId('container');
    expect(el.className).toContain('max-w-6xl');
  });

  it('applies custom size', () => {
    render(<Container size="sm" data-testid="container">Content</Container>);
    const el = screen.getByTestId('container');
    expect(el.className).toContain('max-w-2xl');
  });

  it('accepts additional className', () => {
    render(<Container className="custom-container" data-testid="container">Content</Container>);
    const el = screen.getByTestId('container');
    expect(el.className).toContain('custom-container');
  });
});