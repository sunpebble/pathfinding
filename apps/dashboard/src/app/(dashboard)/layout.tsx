/**
 * Dashboard layout with sidebar and header chrome.
 *
 * All authenticated dashboard pages (overview, jobs, pois, chat, etc.)
 * are rendered inside this layout with the standard navigation UI.
 */

import { ErrorBoundary } from '@/components/error-boundary';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
