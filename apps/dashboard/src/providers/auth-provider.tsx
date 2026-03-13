'use client';

/**
 * Authentication provider and context hook.
 *
 * Manages the JWT token lifecycle (storage, refresh, clear) and
 * exposes sign-in / sign-up / sign-out actions to the component tree
 * via React context.
 *
 * On mount, if a token exists in localStorage the provider will
 * attempt to validate it by fetching the current user profile.
 * If validation fails the token is silently cleared.
 *
 * @module
 */

import type { ReactNode } from 'react';
import type { AuthContextValue, AuthResponse, SignInInput, SignUpInput, User } from '@/types/api';
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, signIn as signInRequest, signOut as signOutRequest, signUp as signUpRequest } from '@/lib/api/auth';
import {
  AUTH_TOKEN_STORAGE_KEY,
  clearStoredAuthToken,
  getStoredAuthToken,
  setStoredAuthToken,
} from '@/lib/api/client';

const AuthContext = createContext<AuthContextValue | null>(null);

export { AUTH_TOKEN_STORAGE_KEY };

const AUTH_BOOTSTRAP_ERROR_MESSAGE = 'Failed to load authenticated user';

/**
 * Provides authentication state and actions to the component tree.
 *
 * Must wrap any component that uses {@link useAuthContext} or the
 * `useAuth` convenience hook.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());
  const [isLoading, setIsLoading] = useState(() => getStoredAuthToken() !== null);

  /**
   * Re-validate the stored token by fetching the current user.
   *
   * Returns the user on success or `null` if the token is invalid/missing.
   */
  const refreshUser = useCallback(async (): Promise<User | null> => {
    const nextToken = getStoredAuthToken();

    if (!nextToken) {
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);

    try {
      const response = await getCurrentUser();
      setToken(nextToken);
      setUser(response.data);
      return response.data;
    }
    catch {
      clearStoredAuthToken();
      setToken(null);
      setUser(null);
      return null;
    }
    finally {
      setIsLoading(false);
    }
  }, []);

  // Validate token on mount
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  /**
   * Store the token from a successful auth response and load the user profile.
   *
   * @throws If the user profile cannot be loaded after storing the token.
   */
  const finalizeAuthentication = useCallback(async (response: AuthResponse): Promise<void> => {
    setStoredAuthToken(response.token);
    setToken(response.token);

    const authenticatedUser = await refreshUser();

    if (!authenticatedUser) {
      throw new Error(AUTH_BOOTSTRAP_ERROR_MESSAGE);
    }
  }, [refreshUser]);

  /** Sign in with email and password. */
  const signIn = useCallback(async (input: SignInInput): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await signInRequest(input);
      await finalizeAuthentication(response);
    }
    finally {
      setIsLoading(false);
    }
  }, [finalizeAuthentication]);

  /** Register a new account. */
  const signUp = useCallback(async (input: SignUpInput): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await signUpRequest(input);
      await finalizeAuthentication(response);
    }
    finally {
      setIsLoading(false);
    }
  }, [finalizeAuthentication]);

  /** Sign out and clear all auth state. */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      await signOutRequest();
    }
    finally {
      clearStoredAuthToken();
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: user !== null && token !== null,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  }), [isLoading, refreshUser, signIn, signOut, signUp, token, user]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

/**
 * Access the auth context from within the `<AuthProvider>` tree.
 *
 * @throws If called outside of an `<AuthProvider>`.
 */
export function useAuthContext(): AuthContextValue {
  const value = use(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return value;
}
