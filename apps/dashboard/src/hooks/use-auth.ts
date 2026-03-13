'use client';

/**
 * Convenience hook for accessing the auth context.
 *
 * This is a thin wrapper around {@link useAuthContext} from the
 * auth provider. Prefer importing from `@/hooks/use-auth` in
 * components to decouple them from the provider module.
 *
 * @throws If used outside of an `<AuthProvider>`.
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, signOut } = useAuth();
 * ```
 */

import { useAuthContext } from '@/providers/auth-provider';

export function useAuth() {
  return useAuthContext();
}
