'use client';

/**
 * Dashboard layout with sidebar and header chrome.
 *
 * All authenticated dashboard pages (overview, jobs, pois, chat, etc.)
 * are rendered inside this layout with the standard navigation UI.
 *
 * Centralizes the auth guard: unauthenticated visitors are redirected to
 * `/` here, so individual pages no longer need their own redirect effect.
 */

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { DashboardLoadingState } from '@/components/ui/dashboard-primitives';
import { useAuthContext as useAuth } from '@/providers/auth-provider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <DashboardLoadingState label="加载中" className="min-h-screen" />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="dashboard-pattern flex h-screen text-stone-900 dark:bg-stone-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 py-5 pt-20 sm:px-6 lg:px-8 lg:pt-6">
          <div className="mx-auto w-full max-w-7xl">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
