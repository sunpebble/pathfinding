'use client';

/**
 * Client-side authenticated API transport.
 *
 * Provides a thin wrapper around `fetch` that automatically attaches
 * the stored JWT token, serializes request bodies, and parses JSON
 * responses with proper error handling via {@link ApiError}.
 *
 * @module
 */

import { normalizeHeaders } from './shared';

/** localStorage key used to persist the JWT auth token. */
export const AUTH_TOKEN_STORAGE_KEY = 'sunpebble.trips.dashboard.auth.token';

/**
 * Structured error thrown when a non-2xx response is received.
 *
 * Consumers can inspect {@link status} for HTTP status code and
 * {@link data} for the parsed response body (if any).
 */
export class ApiError extends Error {
  /** HTTP status code of the failed response. */
  readonly status: number;
  /** Parsed response body, if available. */
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readTokenFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function buildUrl(basePath: string, path: string): string {
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  }
  catch {
    return text as T;
  }
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  // Pass BodyInit types through unchanged; JSON.stringify plain objects.
  if (body !== null && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !(body instanceof Blob) && !(body instanceof ArrayBuffer)) {
    return JSON.stringify(body);
  }

  return body as BodyInit;
}

function extractErrorMessage(data: unknown, statusText: string): string {
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return data.error;
  }

  if (typeof data === 'string' && data.length > 0) {
    if (data === 'Internal Server Error' || data === 'Internal server error') {
      return '服务暂时不可用，请稍后重试';
    }
    return data;
  }

  return statusText || '请求失败，请重试';
}

// ---------------------------------------------------------------------------
// Public API — token management
// ---------------------------------------------------------------------------

/** Read the stored JWT token from localStorage (returns `null` on the server). */
export function getStoredAuthToken(): string | null {
  return readTokenFromStorage();
}

/** Persist a JWT token to localStorage. No-op on the server. */
export function setStoredAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }
}

/** Remove the stored JWT token from localStorage. No-op on the server. */
export function clearStoredAuthToken(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

// ---------------------------------------------------------------------------
// Public API — client factory
// ---------------------------------------------------------------------------

/** Return type of {@link createApiClient}. */
export interface ApiClient {
  /** `GET` request. */
  get: <T>(path: string, init?: RequestInit) => Promise<T>;
  /** `POST` request with optional JSON body. */
  post: <T>(path: string, body?: unknown, init?: RequestInit) => Promise<T>;
  /** `PATCH` request with optional JSON body. */
  patch: <T>(path: string, body?: unknown, init?: RequestInit) => Promise<T>;
  /** `DELETE` request. */
  delete: <T>(path: string, init?: RequestInit) => Promise<T>;
}

/**
 * Create an API client bound to a given base path.
 *
 * The client automatically:
 * - attaches the stored JWT `Authorization` header,
 * - sets `Content-Type: application/json` for non-FormData bodies,
 * - parses JSON responses,
 * - throws {@link ApiError} on non-2xx responses.
 *
 * @param basePath - URL prefix for all requests (e.g. `/api/auth`).
 * @returns An {@link ApiClient} with convenience methods for common HTTP verbs.
 */
export function createApiClient(basePath: string): ApiClient {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = normalizeHeaders(init.headers);
    const token = getStoredAuthToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (init.body && !headers['Content-Type'] && !(init.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(buildUrl(basePath, path), {
        ...init,
        headers,
      });
    }
    catch {
      throw new ApiError('服务暂时不可用，请稍后重试', 0, null);
    }

    const data = await parseResponse<unknown>(response);

    if (!response.ok) {
      throw new ApiError(
        extractErrorMessage(data, response.statusText),
        response.status,
        data,
      );
    }

    return data as T;
  }

  return {
    get<T>(path: string, init?: RequestInit) {
      return request<T>(path, { ...init, method: 'GET' });
    },
    post<T>(path: string, body?: unknown, init?: RequestInit) {
      return request<T>(path, {
        ...init,
        method: 'POST',
        body: serializeBody(body),
      });
    },
    patch<T>(path: string, body?: unknown, init?: RequestInit) {
      return request<T>(path, {
        ...init,
        method: 'PATCH',
        body: serializeBody(body),
      });
    },
    delete<T>(path: string, init?: RequestInit) {
      return request<T>(path, { ...init, method: 'DELETE' });
    },
  };
}
