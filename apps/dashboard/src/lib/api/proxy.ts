import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { BackendApiError, fetchBackendApi } from './backend';
import { normalizeHeaders } from './shared';

type ProxyBodyFactory = () => Promise<unknown> | unknown;

export interface BackendProxyOptions<TBackend, TClient = TBackend> {
  endpoint: string;
  method?: string;
  requireAuth?: boolean;
  body?: unknown | ProxyBodyFactory;
  headers?: HeadersInit;
  successStatus?: number;
  fallbackError?: string;
  transform?: (payload: TBackend) => TClient | Promise<TClient>;
}

export function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function resolveBody(body: unknown | ProxyBodyFactory | undefined): Promise<unknown> {
  if (typeof body === 'function') {
    return (body as ProxyBodyFactory)();
  }

  return body;
}

export async function proxyBackendApiResponse<TBackend, TClient = TBackend>(
  request: NextRequest | Request,
  options: BackendProxyOptions<TBackend, TClient>,
) {
  const requireAuth = options.requireAuth ?? true;
  const token = getBearerToken(request);

  if (requireAuth && !token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const headers = normalizeHeaders(options.headers);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const body = await resolveBody(options.body);
    const payload = await fetchBackendApi<TBackend>(options.endpoint, {
      method: options.method ?? 'GET',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const transformed = options.transform ? await options.transform(payload) : payload;
    return NextResponse.json(transformed, { status: options.successStatus ?? 200 });
  }
  catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error(options.fallbackError ?? 'Backend proxy request failed', error);
    return NextResponse.json(
      { error: options.fallbackError ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
