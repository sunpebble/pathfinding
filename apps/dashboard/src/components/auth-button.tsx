'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@pathfinding/convex-client';
import { useQuery } from 'convex/react';
import { ChevronDown, Loader2, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';

export function AuthButton() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Get current user data
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/auth/signin');
    }
    catch (error) {
      console.error('Failed to sign out:', error);
      setIsSigningOut(false);
    }
  };

  // Loading state
  if (authLoading) {
    return <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200" />;
  }

  // Unauthenticated - show Sign In button
  if (!isAuthenticated) {
    return (
      <Link
        href="/auth/signin"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Sign In
      </Link>
    );
  }

  // Authenticated - show user menu
  const displayName
    = currentUser?.profile?.displayName
      || currentUser?.name
      || currentUser?.email?.split('@')[0]
      || 'User';
  const userEmail = currentUser?.email || '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="User menu"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-gray-700">{displayName}</span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-gray-900">
              {displayName}
            </p>
            <p className="text-xs leading-none text-gray-500">{userEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href="/profile"
              className="flex w-full cursor-pointer items-center gap-2"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleSignOut();
          }}
          disabled={isSigningOut}
          className="cursor-pointer gap-2"
        >
          {isSigningOut
            ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              )
            : (
                <LogOut className="h-4 w-4" />
              )}
          {isSigningOut ? 'Signing out...' : 'Sign Out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
