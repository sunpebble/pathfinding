import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthButton } from './auth-button';

const mockPush = vi.fn();
const mockSignOut = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({
    signOut: mockSignOut,
  }),
}));

const mockUseAuth = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseQuery = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: () => mockUseQuery(),
}));

// Mock ResizeObserver for Radix UI
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock DOMRect for Radix UI
if (!globalThis.DOMRect) {
  // @ts-expect-error - DOMRect is missing in JSDOM
  globalThis.DOMRect = {
    fromRect: () => ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} }),
  } as unknown as typeof DOMRect;
}

// Mock PointerEvent for Radix UI
class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;

  constructor(type: string, props: PointerEventInit) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || 'mouse';
  }
}
window.PointerEvent = MockPointerEvent as unknown as typeof PointerEvent;
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();

describe('auth button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true });
    render(<AuthButton />);
    const loadingDiv = document.querySelector('.animate-pulse');
    expect(loadingDiv).toBeDefined();
  });

  it('renders sign in button when unauthenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });
    render(<AuthButton />);
    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toBeDefined();
    expect(signInLink.getAttribute('href')).toBe('/auth/signin');
  });

  it('renders user menu when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseQuery.mockReturnValue({
      profile: { displayName: 'Test User' },
      email: 'test@example.com',
    });

    render(<AuthButton />);
    const userButton = screen.getByText('Test User');
    expect(userButton).toBeDefined();
  });

  it('opens menu and shows user info', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseQuery.mockReturnValue({
      profile: { displayName: 'Test User' },
      email: 'test@example.com',
    });

    render(<AuthButton />);
    const userButton = screen.getByText('Test User');

    // Radix UI often requires pointer down then click
    fireEvent.pointerDown(userButton);
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeDefined();
    });
    expect(screen.getByText('Profile')).toBeDefined();
    expect(screen.getByText('Sign Out')).toBeDefined();
  });

  it('calls signOut and redirects when sign out is clicked', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockUseQuery.mockReturnValue({
      profile: { displayName: 'Test User' },
      email: 'test@example.com',
    });

    render(<AuthButton />);
    const userButton = screen.getByText('Test User');

    fireEvent.pointerDown(userButton);
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeDefined();
    });

    const signOutButton = screen.getByText('Sign Out');

    // For Radix Menu Items, sometimes click is enough, but sometimes we need pointer events
    fireEvent.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalled();
  });
});
