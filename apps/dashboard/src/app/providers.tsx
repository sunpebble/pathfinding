'use client';

/**
 * Top-level client providers for the dashboard app.
 *
 * Wraps children with:
 * 1. **React Query** — data fetching and caching (1-minute stale time).
 * 2. **AuthProvider** — JWT-based authentication context.
 *
 * The `QueryClient` is created once per component lifecycle via
 * `useState` to avoid re-creating it on every render.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/providers/auth-provider';

/** Default stale time for React Query queries (1 minute). */
const DEFAULT_STALE_TIME_MS = 60_000;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: DEFAULT_STALE_TIME_MS,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
