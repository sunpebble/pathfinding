import type * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'emerald' | 'blue' | 'amber' | 'red' | 'purple' | 'stone';

const toneClasses: Record<Tone, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-900/30 dark:text-emerald-300',
  blue: 'bg-blue-100 text-blue-700 ring-blue-200/70 dark:bg-blue-900/30 dark:text-blue-300',
  amber: 'bg-amber-100 text-amber-700 ring-amber-200/70 dark:bg-amber-900/30 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 ring-red-200/70 dark:bg-red-900/30 dark:text-red-300',
  purple: 'bg-purple-100 text-purple-700 ring-purple-200/70 dark:bg-purple-900/30 dark:text-purple-300',
  stone: 'bg-stone-100 text-stone-700 ring-stone-200/70 dark:bg-stone-800 dark:text-stone-300',
};

export function DashboardPageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}

export function DashboardCard({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('dashboard-surface rounded-2xl p-5 backdrop-blur-sm', className)}
      {...props}
    />
  );
}

export function DashboardToolbar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('dashboard-surface flex flex-col gap-3 rounded-2xl p-4 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center', className)}
      {...props}
    />
  );
}

export function DashboardTableShell({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('dashboard-surface overflow-hidden rounded-2xl backdrop-blur-sm', className)}
      {...props}
    />
  );
}

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('dashboard-surface rounded-2xl px-6 py-12 text-center', className)}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 ring-1 ring-stone-200/70 dark:bg-stone-800 dark:text-stone-500">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-stone-900 dark:text-stone-100">
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function DashboardLoadingState({
  label = 'Loading',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex min-h-52 flex-col items-center justify-center gap-3 text-stone-500', className)}>
      <Loader2 className="h-7 w-7 animate-spin text-emerald-600" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'emerald',
  footer,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: Tone;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <DashboardCard className={cn('p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--dashboard-shadow)]', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">{label}</p>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 dark:text-stone-50">
            {value}
          </div>
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1', toneClasses[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      {footer && <div className="mt-4 text-sm text-stone-500 dark:text-stone-400">{footer}</div>}
    </DashboardCard>
  );
}
