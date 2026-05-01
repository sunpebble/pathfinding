'use client';

import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useHealthStatus } from '@/hooks/use-health-status';
import { cn } from '@/lib/utils';
import { AuthButton } from './auth-button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function Header() {
  const {
    data: health,
    isLoading,
    isError,
    refetch,
  } = useHealthStatus();

  const isConnected = Boolean(health?.status === 'ok' || health?.status === 'healthy');
  const statusLabel = isLoading
    ? '检测中'
    : isError
      ? '未知'
      : isConnected
        ? '已连接'
        : '已断开';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200/70 bg-white/85 px-4 shadow-sm shadow-stone-950/5 backdrop-blur-xl sm:px-6 dark:border-stone-800 dark:bg-stone-950/80">
      <div className="flex min-w-0 items-center gap-4 pl-12 lg:pl-0">
        <h1 className="truncate text-sm font-semibold tracking-wide text-stone-900 sm:text-base dark:text-stone-100">
          探路抓取仪表盘
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Health Status */}
        <div
          data-testid="service-status"
          className={cn(
            'hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 sm:flex',
            isLoading
              ? 'bg-stone-50 text-stone-600 ring-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-800'
              : isConnected
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/60'
                : isError
                  ? 'bg-stone-50 text-stone-600 ring-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-800'
                  : 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800/60',
          )}
        >
          {isLoading
            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            : isConnected
              ? <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              : <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>{statusLabel}</span>
        </div>

        {/* Refresh Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              aria-label={isLoading ? '刷新状态中...' : '刷新状态'}
              className={cn(
                'rounded-xl p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-explorer dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
                isLoading && 'cursor-not-allowed opacity-50',
              )}
              title="刷新状态"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>刷新状态</TooltipContent>
        </Tooltip>

        {/* Auth Button */}
        <AuthButton />
      </div>
    </header>
  );
}
