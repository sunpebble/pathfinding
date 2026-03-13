'use client';

/**
 * Dashboard shell with sidebar and header.
 *
 * Wraps authenticated dashboard pages with the standard
 * navigation chrome. Auth pages and the landing page should
 * NOT use this component.
 */

import { ErrorBoundary } from '@/components/error-boundary';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 pt-16 lg:pt-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
