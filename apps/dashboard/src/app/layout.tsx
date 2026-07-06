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
  title: 'Sunpebble Trips — 行程工具',
  description: 'Sunpebble Trips 是一个安静、可编辑的旅行行程工具。',
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
