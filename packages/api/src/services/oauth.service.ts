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
 *
 * @param idToken  Google 颁发的 ID token。
 * @param clientId 期望的 audience（由调用方从 `c.env.GOOGLE_CLIENT_ID` 透传）。
 */
export async function verifyGoogleToken(
  idToken: string,
  clientId: string,
): Promise<GoogleUserInfo> {
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID 是 Google 令牌验证所必需的（通过 c.env 透传）');
  }

  const { payload } = await jose.jwtVerify(idToken, googleJWKS, {
    issuer: ['accounts.google.com', 'https://accounts.google.com'],
    audience: clientId,
  });

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Google 令牌缺少 subject 声明');
  }
  if (!payload.email || typeof payload.email !== 'string') {
    throw new Error('Google 令牌缺少 email 声明');
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
 *
 * @param identityToken Apple 颁发的 identity token。
 * @param clientId      期望的 audience（由调用方从 `c.env.APPLE_CLIENT_ID` 透传）。
 *                      未提供时跳过 audience 校验（保持原行为）。
 */
export async function verifyAppleToken(
  identityToken: string,
  clientId?: string,
): Promise<{
  sub: string;
  email?: string;
}> {
  const verifyOptions: jose.JWTVerifyOptions = {
    issuer: 'https://appleid.apple.com',
  };
  if (clientId) {
    verifyOptions.audience = clientId;
  }

  const { payload } = await jose.jwtVerify(
    identityToken,
    appleJWKS,
    verifyOptions,
  );

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Apple 令牌缺少 subject 声明');
  }

  return {
    sub: payload.sub,
    email: payload.email as string | undefined,
  };
}
