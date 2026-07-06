import type { AuthContextValue, AuthResponse, User } from '@/types/api';
import * as React from 'react';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Node.js 22+ exposes a built-in `localStorage` that lacks methods like
// `clear()`.  Override the global with a simple in-memory implementation so
// that tests can call `window.localStorage.clear()` without errors.
function createStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

vi.stubGlobal('localStorage', createStorageMock());

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
};

export const mockPathname = vi.fn(() => '/');
export const mockParams = vi.fn(() => ({}));
export const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

export function createMockAuthUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'owner@example.com',
    name: 'Owner',
    image: null,
    created_at: '2026-03-06T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockAuthContext(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  const defaultUser = createMockAuthUser();
  const user = overrides.user ?? (overrides.isAuthenticated ? defaultUser : null);
  const token = overrides.token ?? (overrides.isAuthenticated ? 'test-token' : null);

  return {
    user,
    token,
    isAuthenticated: false,
    isLoading: false,
    signIn: vi.fn(async () => {}),
    signUp: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    refreshUser: vi.fn(async () => null),
    ...overrides,
  };
}

export function createMockAuthApi() {
  return {
    signIn: vi.fn(async (_credentials?: { email?: string; password?: string }): Promise<AuthResponse> => ({
      token: 'test-token',
      userId: 'user-1',
      email: 'owner@example.com',
    })),
    signUp: vi.fn(async (_payload?: { email?: string; password?: string; name?: string }): Promise<AuthResponse> => ({
      token: 'test-token',
      userId: 'user-1',
      email: 'owner@example.com',
    })),
    signOut: vi.fn(async () => ({ success: true })),
    getCurrentUser: vi.fn(async () => ({
      data: createMockAuthUser(),
    })),
  };
}

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
  useParams: mockParams,
  usePathname: mockPathname,
  useRouter: vi.fn(() => mockRouter),
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
