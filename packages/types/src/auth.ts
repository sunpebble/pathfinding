/**
 * Authentication related types for phone login
 */

/**
 * User profile returned after authentication
 */
export interface AuthUser {
  id: string;
  phone?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Session data returned after authentication
 */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Request to send OTP
 */
export interface SendOtpInput {
  phone: string;
}

/**
 * Response after sending OTP
 */
export interface SendOtpResponse {
  expiresIn: number;
  cooldown: number;
}

/**
 * Request to verify OTP
 */
export interface VerifyOtpInput {
  phone: string;
  code: string;
}

/**
 * Response after successful OTP verification
 */
export interface VerifyOtpResponse {
  user: AuthUser;
  session: AuthSession;
  isNewUser: boolean;
}

/**
 * Auth error codes
 */
export type AuthErrorCode =
  | 'INVALID_PHONE'
  | 'RATE_LIMITED'
  | 'DAILY_LIMIT_EXCEEDED'
  | 'SMS_SEND_FAILED'
  | 'INVALID_CODE'
  | 'CODE_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'
  | 'AUTH_FAILED';

/**
 * Auth error response
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
  remainingSeconds?: number;
  remainingAttempts?: number;
}
