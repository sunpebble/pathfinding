import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthContext, mockPathname, mockRouter } from '@/test/setup';

import SignInPage from './page';

const mockUseAuth = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('signInPage', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/auth/signin');
    mockRouter.push.mockReset();
    mockRouter.replace.mockReset();
    mockRouter.prefetch.mockReset();
    vi.restoreAllMocks();
  });

  it('hides the form while auth bootstrap is loading', () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ isLoading: true }));

    render(<SignInPage />);

    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in with Email' })).not.toBeInTheDocument();
  });

  it('submits email sign-in and redirects on success', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(createMockAuthContext({ signIn }));

    render(<SignInPage />);

    expect(screen.queryByText('Or continue with')).not.toBeInTheDocument();
    expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument();
    expect(screen.queryByText('Continue with Apple')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Email' }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({
        email: 'owner@example.com',
        password: 'Password123',
      });
    });
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  it('shows an error when email sign-in fails', async () => {
    const signIn = vi.fn().mockRejectedValue(new Error('Invalid email or password'));
    mockUseAuth.mockReturnValue(createMockAuthContext({ signIn }));

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Email' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
