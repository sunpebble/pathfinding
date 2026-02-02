'use client';

import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHealthStatus } from '@/hooks/use-health-status';
import { AuthButton } from './auth-button';

export function Header() {
  const { data: health, isLoading, refetch } = useHealthStatus();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900">
          Pathfinding Crawler Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Health Status */}
        <div className="flex items-center gap-2">
          {isLoading
            ? (
                <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
              )
            : health?.status === 'ok' || health?.status === 'healthy'
              ? (
                  <>
                    <Wifi className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-emerald-600">Connected</span>
                  </>
                )
              : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">Disconnected</span>
                  </>
                )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          aria-label="Refresh status"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          title="Refresh status"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </button>

        {/* Auth Button */}
        <AuthButton />
      </div>
    </header>
  );
}
