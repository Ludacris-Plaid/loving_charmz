import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/Button';

vi.mock('@/lib/supabase/queries/products', () => ({
  getProducts: vi.fn().mockResolvedValue([]),
}));

describe('Button', () => {
  it('renders as a button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Click' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as a link when href is provided', () => {
    render(<Button href="/shop">Shop Now</Button>);
    const link = screen.getByRole('link', { name: 'Shop Now' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/shop');
  });

  it('applies plum variant classes', () => {
    render(<Button variant="plum">Plum</Button>);
    const btn = screen.getByRole('button', { name: 'Plum' });
    expect(btn.className).toContain('btn-plum');
  });

  it('applies outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>);
    const btn = screen.getByRole('button', { name: 'Outline' });
    expect(btn.className).toContain('btn-outline');
    expect(btn.className).toContain('border');
  });

  it('applies size classes', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button', { name: 'Large' });
    expect(btn.className).toContain('px-7');
    expect(btn.className).toContain('py-3');
  });

  it('shows disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button', { name: 'Disabled' });
    expect(btn).toBeDisabled();
    expect(btn.className).toContain('disabled:opacity-50');
  });
});
