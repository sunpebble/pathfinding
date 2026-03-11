import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthContext, mockPathname, mockRouter } from '@/test/setup';

import SignUpPage from './page';

const mockUseAuth = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('signUpPage', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/auth/signup');
    mockRouter.push.mockReset();
    mockRouter.replace.mockReset();
    mockRouter.prefetch.mockReset();
    vi.restoreAllMocks();
  });

  it('hides the form while auth bootstrap is loading', () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ isLoading: true }));

    render(<SignUpPage />);

    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign up with Email' })).not.toBeInTheDocument();
  });

  it('validates password requirements before email sign-up', async () => {
    const signUp = vi.fn();
    mockUseAuth.mockReturnValue(createMockAuthContext({ signUp }));

    render(<SignUpPage />);

    expect(screen.queryByText('Or continue with')).not.toBeInTheDocument();
    expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument();
    expect(screen.queryByText('Continue with Apple')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up with Email' }));

    expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('submits email sign-up and redirects on success', async () => {
    const signUp = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(createMockAuthContext({ signUp }));

    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'Password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign up with Email' }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        email: 'owner@example.com',
        password: 'Password123',
      });
    });
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });
});
