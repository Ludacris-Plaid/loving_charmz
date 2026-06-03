import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HeaderScroll } from '@/components/ui/HeaderScroll';

describe('HeaderScroll', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('adds scrolled class when window.scrollY > 60', () => {
    const header = document.createElement('header');
    header.setAttribute('data-site-header', '');
    document.body.appendChild(header);

    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });

    const addSpy = vi.spyOn(window, 'addEventListener');

    render(<HeaderScroll />);

    expect(header.classList.contains('scrolled')).toBe(true);
    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
  });

  it('does not add scrolled class when window.scrollY <= 60', () => {
    const header = document.createElement('header');
    header.setAttribute('data-site-header', '');
    document.body.appendChild(header);

    Object.defineProperty(window, 'scrollY', { value: 30, configurable: true });

    render(<HeaderScroll />);

    expect(header.classList.contains('scrolled')).toBe(false);
  });

  it('returns null when no header with data-site-header is present', () => {
    const { container } = render(<HeaderScroll />);
    expect(container.firstChild).toBeNull();
  });
});
