import * as React from 'react';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver for Radix UI
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}

  unobserve() {}

  disconnect() {}
};

// Mock DOMRect for Radix UI
globalThis.DOMRect = class DOMRect {
  bottom = 0;
  left = 0;
  right = 0;
  top = 0;

  constructor(public x = 0, public y = 0, public width = 0, public height = 0) {}

  static fromRect(other?: DOMRectInit): DOMRect {
    return new DOMRect(other?.x, other?.y, other?.width, other?.height);
  }

  toJSON() {
    return JSON.stringify(this);
  }
} as any; // eslint-disable-line ts/no-explicit-any

// Mock PointerEvent for Radix UI (needed for some interactions)
if (!globalThis.PointerEvent) {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
    }
  } as any; // eslint-disable-line ts/no-explicit-any
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    addListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(), // deprecated
  })),
  writable: true,
});

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    prefetch: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...props }, children),
}));

vi.mock('convex/react', () => ({
  useConvex: vi.fn(() => ({})),
  useMutation: vi.fn(() => vi.fn()),
  useQuery: vi.fn(() => null),
}));

vi.mock('@convex-dev/auth/react', () => ({
  useAuthActions: vi.fn(() => ({
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock('@pathfinding/convex-client', () => ({
  api: {
    users: {
      getCurrentUser: 'users:getCurrentUser',
    },
  },
}));
