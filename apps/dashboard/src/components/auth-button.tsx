'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@pathfinding/convex';
import { useQuery } from 'convex/react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function AuthButton() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get current user data
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    setIsMenuOpen(false);
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
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="text-gray-700">{displayName}</span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* User Info */}
          <div className="border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">{userEmail}</p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
