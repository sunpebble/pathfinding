import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthContext, mockPathname, mockRouter } from '@/test/setup';

import SignUpPage from './page';

const mockUseAuth = vi.fn();

vi.mock('@/providers/auth-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/providers/auth-provider')>();
  return { ...actual, useAuthContext: () => mockUseAuth() };
});

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

    expect(screen.queryByLabelText('邮箱地址')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '注册' })).not.toBeInTheDocument();
  });

  it('validates password requirements before email sign-up', async () => {
    const signUp = vi.fn();
    mockUseAuth.mockReturnValue(createMockAuthContext({ signUp }));

    render(<SignUpPage />);

    expect(screen.queryByText('Or continue with')).not.toBeInTheDocument();
    expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument();
    expect(screen.queryByText('Continue with Apple')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('邮箱地址'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText('确认密码'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: '注册' }));

    expect(screen.getByText('密码长度至少为 8 位')).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('submits email sign-up and redirects on success', async () => {
    const signUp = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(createMockAuthContext({ signUp }));

    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText('邮箱地址'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByLabelText('确认密码'), {
      target: { value: 'Password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: '注册' }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        email: 'owner@example.com',
        password: 'Password123',
      });
    });
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/overview');
    });
  });
});
