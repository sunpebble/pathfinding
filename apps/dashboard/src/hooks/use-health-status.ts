'use client';

/**
 * Hook for polling the dashboard backend health status.
 *
 * Polls the `/api/health` endpoint every 30 seconds using
 * React Query. Retries once on failure before reporting an error.
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError } = useHealthStatus();
 * const isHealthy = data?.status === 'ok';
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { getHealth } from '@/lib/api';

/** React Query key for the health status query. */
const HEALTH_QUERY_KEY = ['health'] as const;

/** Polling interval in milliseconds (30 seconds). */
const POLL_INTERVAL_MS = 30_000;

export function useHealthStatus() {
  return useQuery({
    queryKey: HEALTH_QUERY_KEY,
    queryFn: getHealth,
    refetchInterval: POLL_INTERVAL_MS,
    retry: 1,
  });
}
