import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/hooks/use-auth';
import { useAuthActions } from '@convex-dev/auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';

import { AuthButton } from './auth-button';

// Mock ResizeObserver and DOMRect for Radix UI
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

global.DOMRect = class DOMRect {
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
} as any;

// Mock dependencies
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@convex-dev/auth/react', () => ({
  useAuthActions: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@pathfinding/convex-client', () => ({
  api: {
    users: {
      getCurrentUser: 'users:getCurrentUser',
    },
  },
}));

// Mock PointerEvent if not available in jsdom (often needed for Radix)
if (!global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    public pointerId: number;
    public pointerType: string;
    public isPrimary: boolean;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId || 0;
      this.pointerType = params.pointerType || 'mouse';
      this.isPrimary = params.isPrimary || false;
    }
  }
  global.PointerEvent = PointerEvent as any;
}

// Radix UI often uses setPointerCapture, so we mock it on Element prototype
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
Element.prototype.hasPointerCapture = vi.fn();

describe('AuthButton', () => {
  const mockSignOut = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    vi.mocked(useAuthActions).mockReturnValue({
      signOut: mockSignOut,
    });

    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any);

    vi.mocked(useQuery).mockReturnValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    const { container } = render(<AuthButton />);
    // Check for the pulse animation class or structure
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('renders sign in button when unauthenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(<AuthButton />);
    const link = screen.getByRole('link', { name: /sign in/i });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/auth/signin');
  });

  it('renders user menu when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    vi.mocked(useQuery).mockReturnValue({
      name: 'Test User',
      email: 'test@example.com',
      profile: {
        displayName: 'Test User Display',
      },
    });

    render(<AuthButton />);

    // Check if user name is displayed
    expect(screen.getByText('Test User Display')).toBeDefined();

    // Check if avatar initial is correct
    expect(screen.getByText('T')).toBeDefined();
  });

  it('opens menu on click', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    vi.mocked(useQuery).mockReturnValue({
      name: 'Test User',
      email: 'test@example.com',
      profile: {
        displayName: 'Test User Display',
      },
    });

    render(<AuthButton />);

    // Find button and click
    const button = screen.getByRole('button');
    fireEvent.pointerDown(button);
    fireEvent.click(button);

    // Wait for menu items to be visible
    // Using findByText which waits for appearance
    const profileItem = await screen.findByText('Profile');
    expect(profileItem).toBeDefined();

    expect(screen.getByText('Sign Out')).toBeDefined();
    expect(screen.getByText('test@example.com')).toBeDefined();
  });

  it('handles sign out', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    vi.mocked(useQuery).mockReturnValue({
      name: 'Test User',
      email: 'test@example.com',
      profile: {
        displayName: 'Test User Display',
      },
    });

    render(<AuthButton />);

    // Open menu
    const button = screen.getByRole('button');
    fireEvent.pointerDown(button);
    fireEvent.click(button);

    // Wait for menu and click sign out
    const signOutBtn = await screen.findByText('Sign Out');
    fireEvent.click(signOutBtn);

    expect(mockSignOut).toHaveBeenCalled();
    // Wait for async actions
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockPush).toHaveBeenCalledWith('/auth/signin');
  });
});
