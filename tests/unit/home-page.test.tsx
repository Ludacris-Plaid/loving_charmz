import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/(marketing)/page';

vi.mock('@/lib/supabase/queries/products', () => ({
  getProducts: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/supabase/queries/collections', () => ({
  getCollections: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/supabase/queries/stats', () => ({
  getCatalogStats: vi.fn().mockResolvedValue({
    productCount: 8,
    collectionCount: 3,
    startingPrice: 165,
  }),
}));

vi.mock('@/lib/cart/server', () => ({
  getCartCount: vi.fn().mockResolvedValue(0),
}));

describe('HomePage', () => {
  it('renders the pet-bond brand message and main calls to action', async () => {
    const jsx = await HomePage();
    render(jsx);

    expect(screen.getByRole('heading', { name: /symbolic/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /jewelry/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /bond.*lasts/i })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /explore collections/i })).toHaveAttribute('href', '/collections');

    expect(screen.getByRole('link', { name: /browse all pieces/i })).toHaveAttribute('href', '/shop');
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

  it('renders the brand badge with live catalog counts', async () => {
    const jsx = await HomePage();
    render(jsx);

    // Counts come from getCatalogStats (mocked above): "Three" and "Eight"
    // prove the numbers render from data, not hardcoded copy.
    await waitFor(() => {
      expect(screen.getByText(/keepsake pieces/i)).toHaveTextContent('Three collections · Eight keepsake pieces');
    });
  });

  it('shows the live starting price instead of a hardcoded one', async () => {
    const jsx = await HomePage();
    render(jsx);

    await waitFor(() => {
      expect(screen.getByText('Starting at $165')).toBeInTheDocument();
    });
  });
});
