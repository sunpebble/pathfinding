/**
 * Root layout for the dashboard app.
 *
 * Wraps all pages with the global providers, sidebar navigation,
 * header, and error boundary.
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/error-boundary';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pathfinding Crawler Dashboard',
  description: 'Manage and monitor data crawling jobs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="flex h-screen bg-gray-100">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto p-6 pt-16 lg:pt-6">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
