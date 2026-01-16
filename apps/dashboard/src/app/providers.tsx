'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ConvexClientProvider } from '@/providers/convex-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ConvexClientProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ConvexClientProvider>
  );
}
