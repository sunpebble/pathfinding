import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useQuery } from 'convex/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/hooks/use-auth';
import { AuthButton } from './auth-button';

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserver;

// Mock DOMRect
globalThis.DOMRect = {
  fromRect: () => ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} }),
} as unknown as typeof DOMRect;

// Mock Pointer Capture methods
HTMLElement.prototype.setPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();
HTMLElement.prototype.hasPointerCapture = vi.fn();

// Mock dependencies
const mockSignOut = vi.fn();
const mockPush = vi.fn();

vi.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({ signOut: mockSignOut }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}));

// Mock api object
vi.mock('@pathfinding/convex-client', () => ({
  api: {
    users: {
      getCurrentUser: 'users:getCurrentUser',
    },
  },
}));

describe('authButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });
    vi.mocked(useQuery).mockReturnValue(undefined);

    const { container } = render(<AuthButton />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders sign in button when unauthenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<AuthButton />);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/signin');
  });

  it('renders user button when authenticated', () => {
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
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument(); // Initial
  });

  it('opens dropdown when user button is clicked', async () => {
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

    // Find the button that opens the dropdown
    const trigger = screen.getByRole('button', { name: /Test User/i });
    expect(trigger).toBeInTheDocument();

    // Radix UI requires pointer events or keyboard events
    // Using keyboard event is often more reliable in JSDOM
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Check for dropdown content
    expect(await screen.findByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });
});
