import Apple from '@auth/core/providers/apple';
import Google from '@auth/core/providers/google';
import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';
/**
 * Convex Auth Configuration
 * Supports password-based and OAuth authentication
 * Providers: Password, Google, Apple
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
    providers: [Password, Google, Apple],
});
