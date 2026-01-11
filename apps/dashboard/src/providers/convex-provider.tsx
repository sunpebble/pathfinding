'use client';

import type { ReactNode } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// Initialize Convex client with the self-hosted URL
const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? 'https://convex.kunish.org'
);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
