import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MobileMenu } from '@/components/marketing/MobileMenu';

describe('MobileMenu', () => {
  it('renders a menu button with cart count', () => {
    render(<MobileMenu cartCount={3} />);
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });

  it('opens the menu when clicked', async () => {
    render(<MobileMenu cartCount={2} />);
    await userEvent.click(screen.getByLabelText('Open menu'));
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
    expect(screen.getByText('Shop')).toBeInTheDocument();
    expect(screen.getByText('Custom Orders')).toBeInTheDocument();
  });

  it('closes the menu when a link is clicked', async () => {
    render(<MobileMenu cartCount={0} />);
    await userEvent.click(screen.getByLabelText('Open menu'));
    await userEvent.click(screen.getByText('Shop'));
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });
});
