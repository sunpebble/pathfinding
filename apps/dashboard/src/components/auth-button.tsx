'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@pathfinding/convex-client';
import { useQuery } from 'convex/react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
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

  // Get current user data
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/signin');
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
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label="User menu"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
            {avatarLetter}
          </div>
          <span className="text-gray-700">{displayName}</span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer w-full flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
