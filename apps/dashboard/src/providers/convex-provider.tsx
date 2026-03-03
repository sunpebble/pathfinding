'use client';

import type { ReactNode } from 'react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// Initialize Convex client with the self-hosted URL
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is required');
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>
    </ConvexProvider>
  );
}
