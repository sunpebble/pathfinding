import type { AppType } from '../app.js';
import * as jose from 'jose';

const TEST_JWT_SECRET = 'test-jwt-secret';

export interface AuthTokenOptions {
  userId?: string;
  email?: string;
}

function ensureJwtSecret() {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
}

export async function buildAuthToken(options: AuthTokenOptions = {}) {
  ensureJwtSecret();

  const { userId = '1', email = 'owner@example.com' } = options;

  return new jose.SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_JWT_SECRET));
}

export async function requestWithAuth(
  app: AppType,
  path: string,
  init: RequestInit = {},
  auth: AuthTokenOptions = {},
) {
  const token = await buildAuthToken(auth);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return app.request(path, {
    ...init,
    headers,
  });
}
