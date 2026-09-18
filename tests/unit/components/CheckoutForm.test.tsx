import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CheckoutForm } from '@/components/shop/CheckoutForm';

const createCheckoutAction = vi.fn();

vi.mock('@/lib/checkout/actions', () => ({
  createCheckoutAction: (...args: unknown[]) => createCheckoutAction(...args),
}));

const methods = [
  {
    id: 'paypal' as const,
    label: 'PayPal',
    description: 'Pay with your PayPal balance.',
    configured: true,
  },
  {
    id: 'card' as const,
    label: 'Credit / Debit Card',
    description: 'Secure card checkout hosted by Square.',
    configured: false,
  },
];

beforeEach(() => {
  createCheckoutAction.mockReset();
});

describe('CheckoutForm', () => {
  it('blocks submission and explains when no provider is configured', () => {
    render(
      <CheckoutForm
        defaultEmail="tracy@example.com"
        methods={methods.map((method) => ({ ...method, configured: false }))}
        totalAmount={100}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/payments are not configured/i);
    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeDisabled();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('only offers the configured providers', () => {
    render(<CheckoutForm defaultEmail="tracy@example.com" methods={methods} totalAmount={100} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /paypal/i })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /credit/i })).not.toBeInTheDocument();
  });

  it('sends the shopper to the provider checkout', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    createCheckoutAction.mockResolvedValue({ orderId: 'order-1', redirectUrl: 'https://www.sandbox.paypal.com/x' });

    const { container } = render(<CheckoutForm defaultEmail="tracy@example.com" methods={methods} totalAmount={100} />);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(createCheckoutAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://www.sandbox.paypal.com/x'));
    vi.unstubAllGlobals();
  });

  it('shows the server error when no payment could be started', async () => {
    createCheckoutAction.mockResolvedValue({ error: 'PayPal is not configured for this environment.' });

    const { container } = render(<CheckoutForm defaultEmail="tracy@example.com" methods={methods} totalAmount={100} />);
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(await screen.findByText(/not configured/i)).toBeInTheDocument();
  });
});
