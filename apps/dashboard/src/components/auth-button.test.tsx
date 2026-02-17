import { useAuthActions } from '@convex-dev/auth/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useQuery } from 'convex/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/hooks/use-auth';
import { AuthButton } from './auth-button';

// Mock dependencies
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

// We need to re-mock this here to access mockReturnValue,
// even though it's mocked in setup.ts, strictly typing it helps.
// Actually, setup.ts mocks are global, but importing them allows type casting.

describe('authButton', () => {
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

    render(<AuthButton />);

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/signin');
  });

  it('renders loading state when loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });

    const { container } = render(<AuthButton />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders user menu trigger when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    vi.mocked(useQuery).mockReturnValue({
      name: 'Test User',
      email: 'test@example.com',
    });

    render(<AuthButton />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    // The initial 'T' should be present
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('opens menu on click and shows user details', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    vi.mocked(useQuery).mockReturnValue({
      name: 'Test User',
      email: 'test@example.com',
    });

    const mockSignOut = vi.fn();
    vi.mocked(useAuthActions).mockReturnValue({
      signOut: mockSignOut,
      signIn: vi.fn(),
    });

    render(<AuthButton />);

    // Find the trigger button
    // It uses aria-label "User menu"
    const button = screen.getByRole('button', { name: /User menu/i });

    // Open the menu
    // Radix UI requires pointerDown + click for some interactions in JSDOM,
    // or just click depending on configuration.
    fireEvent.pointerDown(button);
    fireEvent.click(button);

    // Check for menu items
    // Using findByText to handle potential async rendering/portal
    expect(await screen.findByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
