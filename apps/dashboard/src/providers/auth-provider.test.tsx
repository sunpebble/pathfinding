import type { ReactNode } from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/hooks/use-auth';
import { AUTH_TOKEN_STORAGE_KEY, AuthProvider } from './auth-provider';

async function patchReactContextAccess() {
  const reactModule = await import('react') as typeof import('react') & Record<string, unknown>;
  const contextReaderKey = 'use';

  if (typeof reactModule[contextReaderKey] !== 'function') {
    reactModule[contextReaderKey] = (<T,>(value: Promise<T> | T) => value) as typeof import('react').use;
  }
}

beforeEach(async () => {
  await patchReactContextAccess();
});

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  };
}

function AuthActionHarness({ mode }: { mode: 'signIn' | 'signUp' }) {
  const auth = useAuth();

  async function handleClick() {
    try {
      if (mode === 'signIn') {
        await auth.signIn({ email: 'owner@example.com', password: 'Password123' });
      }
      else {
        await auth.signUp({ email: 'owner@example.com', password: 'Password123' });
      }
    }
    catch (error) {
      (window as Window & { __authError?: string }).__authError
        = error instanceof Error ? error.message : 'unknown';
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick}>
        run-auth-action
      </button>
      <span data-testid="is-authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="is-loading">{String(auth.isLoading)}</span>
      <span data-testid="user-email">{auth.user?.email ?? 'none'}</span>
    </>
  );
}

function AuthStateSnapshot() {
  const auth = useAuth();

  return (
    <span>
      {auth.token ?? 'none'}
      :
      {String(auth.isLoading)}
    </span>
  );
}

describe('authProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    delete (window as Window & { __authError?: string }).__authError;
  });

  it('does not expose persisted auth during render', () => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'stored-token');

    const html = renderToString(
      <AuthProvider>
        <AuthStateSnapshot />
      </AuthProvider>,
    );

    expect(html.replaceAll('<!-- -->', '')).toContain('none:true');
  });

  it('loads /api/auth/me with a stored token', async () => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'stored-token');

    const fetchMock = vi.fn().mockResolvedValue(
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
    );

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer stored-token',
        }),
      }),
    );
    expect(result.current.user?.email).toBe('owner@example.com');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('rejects signIn when user bootstrap fails after token issuance', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token: 'issued-token',
            userId: 'user-1',
            email: 'owner@example.com',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'User bootstrap failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(<AuthActionHarness mode="signIn" />, {
      wrapper: createWrapper(),
    });

    fireEvent.click(screen.getByRole('button', { name: 'run-auth-action' }));

    await waitFor(() => {
      expect((window as Window & { __authError?: string }).__authError).toBe(
        'Failed to load authenticated user',
      );
    });

    expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    expect(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('rejects signUp when user bootstrap fails after token issuance', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            token: 'issued-token',
            userId: 'user-1',
            email: 'owner@example.com',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'User bootstrap failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    vi.stubGlobal('fetch', fetchMock);

    render(<AuthActionHarness mode="signUp" />, {
      wrapper: createWrapper(),
    });

    fireEvent.click(screen.getByRole('button', { name: 'run-auth-action' }));

    await waitFor(() => {
      expect((window as Window & { __authError?: string }).__authError).toBe(
        'Failed to load authenticated user',
      );
    });

    expect(screen.getByTestId('user-email')).toHaveTextContent('none');
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    expect(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
