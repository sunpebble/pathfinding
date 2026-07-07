import type { AppType } from '../app.js';
import type { Env } from '../env.js';
import * as jose from 'jose';

const TEST_JWT_SECRET = 'test-jwt-secret';

export interface AuthTokenOptions {
  userId?: string;
  email?: string;
}

/**
 * Default Cloudflare Worker Bindings for test requests.
 *
 * `createDb` is mocked at the module level (per test file) to ignore its D1
 * argument and return a `mockDb`, so `DB` can stay undefined. `JWT_SECRET`
 * must be present so `authRequired()`/`authOptional()` middlewares don't
 * throw "Authentication service misconfigured". Individual tests pass
 * overrides for the secrets their route reads (e.g. `DEEPSEEK_API_KEY`).
 */
export function testEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: undefined as unknown as Env['DB'],
    UPLOADS: undefined as unknown as Env['UPLOADS'],
    JWT_SECRET: TEST_JWT_SECRET,
    CORS_ORIGIN: '*',
    // Default test token carries email 'owner@example.com'; treat it as admin
    // so admin-route tests pass. Routes that don't use adminRequired() ignore this.
    ADMIN_EMAILS: 'owner@example.com',
    ...overrides,
  };
}

export async function buildAuthToken(options: AuthTokenOptions = {}) {
  const { userId = '1', email = 'owner@example.com' } = options;

  return new jose.SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_JWT_SECRET));
}

/** Authenticated request — injects a signed Bearer token and the env Bindings. */
export async function requestWithAuth(
  app: AppType,
  path: string,
  init: RequestInit = {},
  auth: AuthTokenOptions = {},
  env: Partial<Env> = {},
) {
  const token = await buildAuthToken(auth);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return app.request(path, { ...init, headers }, testEnv(env));
}

/** Unauthenticated request — still injects env Bindings (JWT_SECRET, etc.). */
export async function requestWithEnv(
  app: AppType,
  path: string,
  init: RequestInit = {},
  env: Partial<Env> = {},
) {
  return app.request(path, init, testEnv(env));
}
