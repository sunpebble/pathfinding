import type { Id } from '../../../../convex/_generated/dataModel';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation } from 'convex/react';
import Constants from 'expo-constants';
import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { api } from '../../../../convex/_generated/api';

// Check if running in development mode
const isDevelopment = __DEV__ || Constants.expoConfig?.extra?.isDevelopment;

// Storage key for persisting auth session
const AUTH_SESSION_KEY = '@pathfinding/auth_session';

/**
 * User type for Convex auth
 */
export interface ConvexUser {
  id: Id<'users'>;
  phone?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: number;
}

/**
 * Session type for Convex auth
 */
export interface ConvexSession {
  userId: Id<'users'>;
  expiresAt: number;
}

interface StoredAuthSession {
  user: ConvexUser;
  session: ConvexSession;
}

interface AuthContextType {
  user: ConvexUser | null;
  userId: Id<'users'> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithPhone: (phone: string) => Promise<{
    needsVerification: boolean;
    expiresIn?: number;
    cooldown?: number;
  }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ isNewUser: boolean }>;
  signOut: () => Promise<void>;
  error: Error | null;
  clearError: () => void;
  isDevelopment: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider that manages authentication state using Convex
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ConvexUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Convex mutations
  const sendOtpMutation = useMutation(api.auth.sendOtp);
  const verifyOtpMutation = useMutation(api.auth.verifyOtp);

  // Initialize auth state from stored session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);
        if (storedSession) {
          const authData: StoredAuthSession = JSON.parse(storedSession);
          // Check if session is still valid (not expired)
          if (authData.session.expiresAt > Date.now()) {
            setUser(authData.user);
            setIsLoading(false);
            return;
          }
          // Session expired, clear it
          await AsyncStorage.removeItem(AUTH_SESSION_KEY);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Sign in with phone number
   * Sends OTP via Convex mutation
   */
  const signInWithPhone = useCallback(
    async (
      phone: string
    ): Promise<{
      needsVerification: boolean;
      expiresIn?: number;
      cooldown?: number;
    }> => {
      try {
        setError(null);
        setIsLoading(true);

        const result = await sendOtpMutation({ phone });

        return {
          needsVerification: true,
          expiresIn: result.expiresIn,
          cooldown: result.cooldown,
        };
      } catch (err) {
        const error = err as Error;
        setError(error);
        return { needsVerification: false };
      } finally {
        setIsLoading(false);
      }
    },
    [sendOtpMutation]
  );

  /**
   * Verify OTP code sent to phone
   * Returns isNewUser to indicate if this is a new registration
   */
  const verifyOtp = useCallback(
    async (phone: string, otp: string): Promise<{ isNewUser: boolean }> => {
      try {
        setError(null);
        setIsLoading(true);

        const result = await verifyOtpMutation({ phone, code: otp });

        // Create session (expires in 30 days)
        const session: ConvexSession = {
          userId: result.user.id as Id<'users'>,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        };

        const convexUser: ConvexUser = {
          id: result.user.id as Id<'users'>,
          phone: result.user.phone,
          email: result.user.email,
          displayName: result.user.displayName,
          avatarUrl: result.user.avatarUrl,
          createdAt: result.user.createdAt,
        };

        // Store session in AsyncStorage
        const authData: StoredAuthSession = {
          user: convexUser,
          session,
        };
        await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authData));

        // Update state
        setUser(convexUser);

        return { isNewUser: result.isNewUser };
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [verifyOtpMutation]
  );

  const signOut = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Clear stored session
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);

      // Clear state
      setUser(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    userId: user?.id ?? null,
    isLoading,
    isAuthenticated: !!user,
    signInWithPhone,
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
