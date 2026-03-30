import * as jose from 'jose';

interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

// ── JWKS key sets (cached by jose) ──────────────────────────────────
const googleJWKS = jose.createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
);
const appleJWKS = jose.createRemoteJWKSet(
  new URL('https://appleid.apple.com/auth/keys'),
);

/**
 * Verify a Google ID token using Google's JWKS endpoint.
 * Validates the JWT signature, issuer, and audience.
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
  const expectedClientId = process.env.GOOGLE_CLIENT_ID;
  if (!expectedClientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is required for Google token verification');
  }

  const { payload } = await jose.jwtVerify(idToken, googleJWKS, {
    issuer: ['accounts.google.com', 'https://accounts.google.com'],
    audience: expectedClientId,
  });

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Google token missing subject claim');
  }
  if (!payload.email || typeof payload.email !== 'string') {
    throw new Error('Google token missing email claim');
  }

  return {
    sub: payload.sub,
    email: payload.email as string,
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
    email_verified: payload.email_verified === true,
  };
}

/**
 * Verify an Apple ID token using Apple's JWKS endpoint.
 * Validates the JWT signature, issuer, and audience.
 */
export async function verifyAppleToken(identityToken: string): Promise<{
  sub: string;
  email?: string;
}> {
  const expectedClientId = process.env.APPLE_CLIENT_ID;

  const verifyOptions: jose.JWTVerifyOptions = {
    issuer: 'https://appleid.apple.com',
  };
  if (expectedClientId) {
    verifyOptions.audience = expectedClientId;
  }

  const { payload } = await jose.jwtVerify(
    identityToken,
    appleJWKS,
    verifyOptions,
  );

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Apple token missing subject claim');
  }

  return {
    sub: payload.sub,
    email: payload.email as string | undefined,
  };
}
