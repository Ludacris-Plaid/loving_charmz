import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from '@/app/(marketing)/page';

describe('HomePage', () => {
  it('renders the pet-bond brand message and main calls to action', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', {
        name: /symbolic jewelry for women who want to carry meaning, memories, and connection/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', {
        name: /shop the bond collection/i,
      }),
    ).toHaveAttribute('href', '/shop');

    expect(
      screen.getByRole('link', {
        name: /create a custom keepsake/i,
      }),
    ).toHaveAttribute('href', '/custom-orders');
  });

  it('renders the three core brand themes', () => {
    render(<HomePage />);

    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('Meaning')).toBeInTheDocument();
    expect(screen.getByText('Permanence')).toBeInTheDocument();
  });

  it('renders the featured keepsake section', () => {
    render(<HomePage />);

    expect(screen.getByText('Featured keepsake')).toBeInTheDocument();
    expect(screen.getByText('The Loyal Companion')).toBeInTheDocument();
  });

  it('renders the customer account link', () => {
    render(<HomePage />);

    expect(screen.getByRole('link', { name: 'Customer account' })).toHaveAttribute('href', '/account');
  });
});