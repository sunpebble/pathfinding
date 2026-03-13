/**
 * Root layout for the dashboard app.
 *
 * Wraps all pages with the global providers, sidebar navigation,
 * header, and error boundary.
 *
 * Auth pages (/auth/*) and the landing page (/) use a clean layout
 * without the sidebar/header chrome.
 */

import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: '探路 Pathfinding — 智能旅行规划',
  description: '用 AI 驱动的旅行规划平台，让每一段旅程都成为独特的探索之旅',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
