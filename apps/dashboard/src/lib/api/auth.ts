import type { AuthResponse, SignInInput, SignUpInput, User } from '@/types/api';
import { createApiClient } from './client';

const authClient = createApiClient('/api/auth');

export function signIn(input: SignInInput) {
  return authClient.post<AuthResponse>('/signin', {
    ...input,
    flow: 'signIn',
  });
}

export function signUp(input: SignUpInput) {
  return authClient.post<AuthResponse>('/signin', {
    ...input,
    flow: 'signUp',
  });
}

export function signOut() {
  return authClient.post<{ success: boolean }>('/signout');
}

export function getCurrentUser() {
  return authClient.get<{ data: User }>('/me');
}
