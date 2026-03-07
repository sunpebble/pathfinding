'use client';

export const AUTH_TOKEN_STORAGE_KEY = 'pathfinding.dashboard.auth.token';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function readTokenFromStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function buildUrl(basePath: string, path: string) {
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function normalizeHeaders(headers?: HeadersInit) {
  if (!headers) {
    return {} as Record<string, string>;
  }

  if (headers instanceof Headers) {
    const normalized: Record<string, string> = {};
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

function serializeBody(body: unknown) {
  if (body === undefined) {
    return undefined;
  }

  if (
    body instanceof FormData
    || body instanceof URLSearchParams
    || body instanceof Blob
    || typeof body === 'string'
    || body instanceof ArrayBuffer
  ) {
    return body;
  }

  return JSON.stringify(body);
}

export function getStoredAuthToken() {
  return readTokenFromStorage();
}

export function setStoredAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }
}

export function clearStoredAuthToken() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

export function createApiClient(basePath: string) {
  async function request<T>(path: string, init: RequestInit = {}) {
    const headers = normalizeHeaders(init.headers);
    const token = getStoredAuthToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (init.body && !headers['Content-Type'] && !(init.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(buildUrl(basePath, path), {
      ...init,
      headers,
    });

    const data = await parseResponse<unknown>(response);

    if (!response.ok) {
      const message
        = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
          : response.statusText || 'Request failed';

      throw new ApiError(message, response.status, data);
    }

    return data as T;
  }

  return {
    request,
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
