import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class IntersectionObserverMock {
  observe = () => null;
  unobserve = () => null;
  disconnect = () => null;
  takeRecords = () => [];
  root = null;
  rootMargin = '';
  thresholds = [];
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

if (typeof URL.createObjectURL !== 'function') {
  let counter = 0;
  URL.createObjectURL = () => `blob:mock-${++counter}`;
  URL.revokeObjectURL = () => undefined;
}
