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
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ success: boolean }>;
  signUpWithEmail: (
    email: string,
    password: string
  ) => Promise<{ success: boolean }>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: AuthError | Error | null;
  clearError: () => void;
  isDevelopment: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
   * In production mode, sends OTP via Supabase
   */
  const signInWithPhone = useCallback(
    async (phone: string): Promise<{ needsVerification: boolean }> => {
      try {
        setError(null);
        setIsLoading(true);

        // Send OTP via Supabase
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
   * Sign in with email and password
   * Used for development mode with local Supabase
   */
  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ success: boolean }> => {
      try {
        setError(null);
        setIsLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        return { success: true };
      } catch (err) {
        setError(err as AuthError);
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Sign up with email and password
   * Used for development mode with local Supabase
   */
  const signUpWithEmail = useCallback(
    async (email: string, password: string): Promise<{ success: boolean }> => {
      try {
        setError(null);
        setIsLoading(true);

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        return { success: true };
      } catch (err) {
        setError(err as AuthError);
        return { success: false };
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

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err as AuthError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
    signInWithPhone,
    signInWithEmail,
    signUpWithEmail,
    verifyOtp,
    signOut,
    error,
    clearError,
    isDevelopment,
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
