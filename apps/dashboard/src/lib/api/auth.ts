/**
 * Auth API client.
 *
 * Wraps the dashboard's `/api/auth/*` proxy routes for
 * sign-in, sign-up, sign-out, and current-user retrieval.
 *
 * @module
 */

import type { AuthResponse, SignInInput, SignUpInput, User } from '@/types/api';
import { createApiClient } from './client';

const authClient = createApiClient('/api/auth');

/**
 * Authenticate with email and password.
 *
 * @param input - Credentials to sign in with.
 * @returns The auth response containing a JWT token.
 */
export function signIn(input: SignInInput): Promise<AuthResponse> {
  return authClient.post<AuthResponse>('/signin', {
    ...input,
    flow: 'signIn',
  });
}

/**
 * Register a new account.
 *
 * @param input - Credentials and optional name for the new user.
 * @returns The auth response containing a JWT token.
 */
export function signUp(input: SignUpInput): Promise<AuthResponse> {
  return authClient.post<AuthResponse>('/signin', {
    ...input,
    flow: 'signUp',
  });
}

/**
 * Sign out the current user (server-side session invalidation).
 *
 * @returns A success indicator.
 */
export function signOut(): Promise<{ success: boolean }> {
  return authClient.post<{ success: boolean }>('/signout');
}

/**
 * Fetch the currently authenticated user's profile.
 *
 * Requires a valid JWT token in localStorage.
 *
 * @returns An envelope containing the user object.
 */
export function getCurrentUser(): Promise<{ data: User }> {
  return authClient.get<{ data: User }>('/me');
}
