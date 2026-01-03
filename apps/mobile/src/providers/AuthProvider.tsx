import type { AuthError, Session, User } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';

// Check if running in development mode
const isDevelopment = __DEV__ || Constants.expoConfig?.extra?.isDevelopment;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithPhone: (phone: string) => Promise<{ needsVerification: boolean }>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: AuthError | Error | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Create a mock user for development mode
 */
function createMockUser(phone: string): User {
  return {
    id: `dev-user-${phone.replace(/\D/g, '')}`,
    aud: 'authenticated',
    role: 'authenticated',
    email: undefined,
    phone,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: { phone },
    identities: [],
    factors: [],
  } as User;
}

/**
 * Create a mock session for development mode
 */
function createMockSession(user: User): Session {
  return {
    access_token: `dev-access-token-${user.id}`,
    refresh_token: `dev-refresh-token-${user.id}`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  };
}

/**
 * Auth provider that manages Supabase authentication state
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | Error | null>(null);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with phone number
   * In development mode, any phone number works without OTP verification
   */
  const signInWithPhone = useCallback(
    async (phone: string): Promise<{ needsVerification: boolean }> => {
      try {
        setError(null);
        setIsLoading(true);

        // Development mode: skip OTP and create mock session
        if (isDevelopment) {
          const mockUser = createMockUser(phone);
          const mockSession = createMockSession(mockUser);
          setUser(mockUser);
          setSession(mockSession);
          setIsLoading(false);
          return { needsVerification: false };
        }

        // Production mode: send OTP via Supabase
        const { error } = await supabase.auth.signInWithOtp({
          phone,
        });

        if (error) throw error;

        return { needsVerification: true };
      } catch (err) {
        setError(err as AuthError);
        return { needsVerification: false };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Verify OTP code sent to phone
   */
  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    try {
      setError(null);
      setIsLoading(true);

      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;
    } catch (err) {
      setError(err as AuthError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // In development mode with mock session, just clear state
      if (isDevelopment && session?.access_token?.startsWith('dev-')) {
        setUser(null);
        setSession(null);
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err as AuthError);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
    signInWithPhone,
    verifyOtp,
    signOut,
    error,
    clearError,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = use(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
