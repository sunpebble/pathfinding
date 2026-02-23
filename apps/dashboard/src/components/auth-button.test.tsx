import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useQuery } from 'convex/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/hooks/use-auth';
import { AuthButton } from './auth-button';

// Mock ResizeObserver and DOMRect for Radix UI
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

globalThis.DOMRect = class DOMRect {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  top = 0;
  right = 0;
  bottom = 0;
  left = 0;
  toJSON() { return {}; }
  static fromRect(_other?: DOMRectInit) { return new DOMRect(); }
} as unknown as typeof DOMRect;

// Mock pointer capture methods
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
Element.prototype.hasPointerCapture = vi.fn();

// Mock dependencies
const mockSignOut = vi.fn();
const mockPush = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({ signOut: mockSignOut }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@pathfinding/convex-client', () => ({
  api: {
    users: {
      getCurrentUser: 'api.users.getCurrentUser',
    },
  },
}));

describe('AuthButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders sign in button when unauthenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<AuthButton />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeDefined();
  });

  it('renders loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    const { container } = render(<AuthButton />);
    // Looking for the animate-pulse class
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders user menu when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(useQuery).mockReturnValue({
      name: 'Test User',
      email: 'test@example.com',
      profile: { displayName: 'Test User' },
    });

    render(<AuthButton />);
    expect(screen.getByText('Test User')).toBeDefined();
  });

  it('opens menu on click and shows profile/logout options', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(useQuery).mockReturnValue({
      name: 'Test User',
      email: 'test@example.com',
      profile: { displayName: 'Test User' },
    });

    render(<AuthButton />);
    const button = screen.getByText('Test User');

    // For Radix UI
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText('Profile')).toBeDefined();
    expect(await screen.findByText('Sign Out')).toBeDefined();
  });

  it('signs out on click', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(useQuery).mockReturnValue({
      name: 'Test User',
      email: 'test@example.com',
      profile: { displayName: 'Test User' },
    });

    render(<AuthButton />);
    const button = screen.getByText('Test User');

    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

    const signOutButton = await screen.findByText('Sign Out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    });
  });
});
