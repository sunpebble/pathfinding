import type { Mock } from "vitest";
import { vi } from "vitest";

interface MockConvexClient {
  query: Mock;
  mutation: Mock;
  action: Mock;
}

/**
 * Create a mock Convex client for testing
 */
export function createMockConvexClient(): MockConvexClient {
  return {
    query: vi.fn(),
    mutation: vi.fn(),
    action: vi.fn(),
  };
}

/**
 * Create a mock Convex ID
 */
export function mockId<T extends string>(table: T, id = "test-id"): string {
  return `${table}:${id}`;
}

/**
 * Create a mock fetch response
 */
export function mockFetchResponse<T>(
  data: T,
  options?: { ok?: boolean; status?: number },
): Mock {
  return vi.fn().mockResolvedValue({
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

/**
 * Create a mock fetch error
 */
export function mockFetchError(error: Error | string): Mock {
  const err = typeof error === "string" ? new Error(error) : error;
  return vi.fn().mockRejectedValue(err);
}

/**
 * Wait for all promises to resolve (useful for testing async operations)
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
