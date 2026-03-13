import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_TOKEN_STORAGE_KEY, AuthProvider } from '@/providers/auth-provider';
import { mockRouter } from '@/test/setup';

import { AuthButton } from './auth-button';

function Wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('authButton', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockRouter.push.mockReset();
    mockRouter.replace.mockReset();
    mockRouter.prefetch.mockReset();
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shows Sign In when unauthenticated', () => {
    render(<AuthButton />, { wrapper: Wrapper });

    expect(screen.getByRole('link', { name: '登录' })).toBeInTheDocument();
  });

  it('shows the user menu when authenticated', async () => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'stored-token');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              id: 'user-1',
              email: 'owner@example.com',
              name: 'Owner',
              image: null,
              created_at: '2026-03-06T00:00:00.000Z',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    );

    render(<AuthButton />, { wrapper: Wrapper });

    expect(await screen.findByRole('button', { name: /Owner/i })).toBeInTheDocument();
  });

  it('signs out, clears auth, and redirects', async () => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'stored-token');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: 'user-1',
              email: 'owner@example.com',
              name: 'Owner',
              image: null,
              created_at: '2026-03-06T00:00:00.000Z',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(<AuthButton />, { wrapper: Wrapper });

    fireEvent.click(await screen.findByRole('button', { name: /Owner/i }));
    fireEvent.click(screen.getByRole('button', { name: '退出登录' }));

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
    await waitFor(() => {
      expect(screen.getByRole('link', { name: '登录' })).toBeInTheDocument();
    });
    expect(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
