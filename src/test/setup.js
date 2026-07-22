import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
vi.stubGlobal('ResizeObserver', ResizeObserverMock);
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
}
