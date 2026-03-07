'use client';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());
  const [isLoading, setIsLoading] = useState(() => getStoredAuthToken() !== null);

  const refreshUser = useCallback(async () => {
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

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const finalizeAuthentication = useCallback(async (response: AuthResponse) => {
    setStoredAuthToken(response.token);
    setToken(response.token);

    const authenticatedUser = await refreshUser();

    if (!authenticatedUser) {
      throw new Error(AUTH_BOOTSTRAP_ERROR_MESSAGE);
    }
  }, [refreshUser]);

  const signIn = useCallback(async (input: SignInInput) => {
    setIsLoading(true);

    try {
      const response = await signInRequest(input);
      await finalizeAuthentication(response);
    }
    finally {
      setIsLoading(false);
    }
  }, [finalizeAuthentication]);

  const signUp = useCallback(async (input: SignUpInput) => {
    setIsLoading(true);

    try {
      const response = await signUpRequest(input);
      await finalizeAuthentication(response);
    }
    finally {
      setIsLoading(false);
    }
  }, [finalizeAuthentication]);

  const signOut = useCallback(async () => {
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

export function useAuthContext() {
  const value = use(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return value;
}
