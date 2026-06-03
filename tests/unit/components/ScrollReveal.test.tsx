import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

describe('ScrollReveal', () => {
  let observers: Array<(entries: Array<{ isIntersecting: boolean; target: Element }>) => void> = [];
  let observeMock: ReturnType<typeof vi.fn>;
  let unobserveMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observers = [];
    observeMock = vi.fn();
    unobserveMock = vi.fn();
    disconnectMock = vi.fn();

    class MockIO {
      constructor(cb: (entries: Array<{ isIntersecting: boolean; target: Element }>) => void) {
        observers.push(cb);
      }
      observe = observeMock;
      unobserve = unobserveMock;
      disconnect = disconnectMock;
    }
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = MockIO;

    vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('starts without the visible class', () => {
    render(
      <ScrollReveal>
        <p>Hello</p>
      </ScrollReveal>
    );
    const wrapper = screen.getByText('Hello').parentElement as HTMLElement;
    expect(wrapper.classList.contains('reveal-scroll')).toBe(true);
    expect(wrapper.classList.contains('visible')).toBe(false);
  });

  it('observes the wrapper on mount', () => {
    render(
      <ScrollReveal>
        <p>Hello</p>
      </ScrollReveal>
    );
    expect(observeMock).toHaveBeenCalledTimes(1);
  });

  it('adds visible class and unobserves when intersection fires', async () => {
    render(
      <ScrollReveal>
        <p>Hello</p>
      </ScrollReveal>
    );
    const wrapper = screen.getByText('Hello').parentElement as HTMLElement;
    const cb = observers[0]!;
    cb([{ isIntersecting: true, target: wrapper }]);
    await waitFor(() => {
      expect(wrapper.classList.contains('visible')).toBe(true);
    });
    expect(unobserveMock).toHaveBeenCalledWith(wrapper);
  });

  it('falls back to visible immediately when IntersectionObserver is missing', () => {
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = undefined;
    render(
      <ScrollReveal>
        <p>Hello</p>
      </ScrollReveal>
    );
    const wrapper = screen.getByText('Hello').parentElement as HTMLElement;
    expect(wrapper.classList.contains('visible')).toBe(true);
  });
});
