import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/(marketing)/page';

vi.mock('@/lib/supabase/queries/products', () => ({
  getProducts: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/cart/server', () => ({
  getCartCount: vi.fn().mockResolvedValue(0),
}));

describe('HomePage', () => {
  it('renders the pet-bond brand message and main calls to action', async () => {
    const jsx = await HomePage();
    render(jsx);

    expect(screen.getByRole('heading', { name: /modern/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /keepsake/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what matters/i })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /shop the bond collection/i })).toHaveAttribute('href', '/shop');

    expect(screen.getByRole('link', { name: /create a custom keepsake/i })).toHaveAttribute('href', '/custom-orders');
  });

  it('renders the three core brand themes', async () => {
    const jsx = await HomePage();
    render(jsx);

    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('Meaning')).toBeInTheDocument();
    expect(screen.getByText('Permanence')).toBeInTheDocument();
  });

  it('renders the featured keepsake section', async () => {
    const jsx = await HomePage();
    render(jsx);

    expect(screen.getByText('Featured keepsake')).toBeInTheDocument();
    expect(screen.getAllByText('The Loyal Companion').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the brand badge', async () => {
    const jsx = await HomePage();
    render(jsx);

    await waitFor(() => {
      expect(screen.getByText('Bond Collection · 4 pieces')).toBeInTheDocument();
    });
  });
});
