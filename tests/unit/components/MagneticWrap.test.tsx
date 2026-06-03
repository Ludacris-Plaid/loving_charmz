import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MagneticWrap } from '@/components/ui/MagneticWrap';

describe('MagneticWrap', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children inside an inline-block wrapper', () => {
    render(
      <MagneticWrap>
        <a href="/shop">Shop</a>
      </MagneticWrap>
    );
    const link = screen.getByRole('link', { name: 'Shop' });
    expect(link).toBeInTheDocument();
    const wrapper = link.parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.display).toBe('inline-block');
  });

  it('sets --mx/--my CSS variables on mouse move within strength bounds', async () => {
    const user = userEvent.setup();
    render(
      <MagneticWrap strength={10}>
        <a href="/shop">Shop</a>
      </MagneticWrap>
    );
    const link = screen.getByRole('link', { name: 'Shop' });
    const wrapper = link.parentElement as HTMLElement;
    const r = { left: 0, top: 0, width: 100, height: 50, right: 100, bottom: 50, x: 0, y: 0, toJSON: () => r };
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue(r);

    fireMouseMove(wrapper, 100, 25);

    const mx = wrapper.style.getPropertyValue('--mx');
    const my = wrapper.style.getPropertyValue('--my');
    expect(mx).not.toBe('');
    expect(my).not.toBe('');
    const mxVal = Number.parseFloat(mx);
    const myVal = Number.parseFloat(my);
    expect(Math.abs(mxVal)).toBeLessThanOrEqual(10);
    expect(Math.abs(myVal)).toBeLessThanOrEqual(10);

    void user;
  });

  function fireMouseMove(el: HTMLElement, x: number, y: number) {
    el.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
  }

  it('resets --mx/--my to 0 on mouse leave', async () => {
    const user = userEvent.setup();
    render(
      <MagneticWrap>
        <a href="/shop">Shop</a>
      </MagneticWrap>
    );
    const link = screen.getByRole('link', { name: 'Shop' });
    const wrapper = link.parentElement as HTMLElement;

    await user.hover(link);
    await user.unhover(link);

    expect(wrapper.style.getPropertyValue('--mx')).toBe('0px');
    expect(wrapper.style.getPropertyValue('--my')).toBe('0px');
  });
});
