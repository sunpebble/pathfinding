import { Buffer } from 'node:buffer';
import { createLogger } from '@pathfinding/logger';

const _log = createLogger('oauth');

interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

/**
 * Verify a Google ID token by calling Google's tokeninfo endpoint.
 * In production, use google-auth-library for proper verification.
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  if (!response.ok) {
    throw new Error('Google token 验证失败');
  }

  const data = await response.json() as Record<string, unknown>;

  // Validate the audience (client ID) if configured
  const expectedClientId = process.env.GOOGLE_CLIENT_ID;
  if (expectedClientId && data.aud !== expectedClientId) {
    throw new Error('Token audience 不匹配');
  }

  return {
    sub: data.sub as string,
    email: data.email as string,
    name: data.name as string | undefined,
    picture: data.picture as string | undefined,
    email_verified: data.email_verified === 'true',
  };
}

/**
 * Verify an Apple ID token.
 * Apple Sign In sends an authorization code + identity token.
 * For now, decode the JWT payload (Apple tokens are JWTs).
 */
export async function verifyAppleToken(identityToken: string): Promise<{
  sub: string;
  email?: string;
}> {
  // Apple identity tokens are JWTs - decode the payload
  const parts = identityToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Apple token 格式无效');
  }

  const payloadStr = Buffer.from(parts[1]!, 'base64url').toString('utf-8');
  const payload = JSON.parse(payloadStr) as Record<string, unknown>;

  // Check expiration
  const exp = payload.exp as number;
  if (exp && Date.now() >= exp * 1000) {
    throw new Error('Apple token 已过期');
  }

  return {
    sub: payload.sub as string,
    email: payload.email as string | undefined,
  };
}
