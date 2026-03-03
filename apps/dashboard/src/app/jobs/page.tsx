'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  Clock,
  Eye,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  StopCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  cancelCrawlJob,
  getCrawlJobs,
  getSchedulerStatus,
  startCrawlJob,
  startScheduledTask,
  stopScheduledTask,
} from '@/lib/api';
import { formatDateTime, shortId } from '@/lib/utils';

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const {
    data: jobsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['crawl-jobs', statusFilter],
    queryFn: () =>
      getCrawlJobs({ status: statusFilter || undefined, limit: 50 }),
  });

  const {
    data: schedulerStatus,
    isLoading: isLoadingScheduler,
    refetch: refetchScheduler,
  } = useQuery({
    queryKey: ['scheduler-status'],
    queryFn: getSchedulerStatus,
    refetchInterval: 10000,
  });

  const startMutation = useMutation({
    mutationFn: startCrawlJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawl-jobs'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelCrawlJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawl-jobs'] });
    },
  });

  const startTaskMutation = useMutation({
    mutationFn: startScheduledTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-status'] });
    },
  });

  const stopTaskMutation = useMutation({
    mutationFn: stopScheduledTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-status'] });
    },
  });

  const jobs = useMemo(() => jobsData?.data ?? [], [jobsData?.data]);

  const handleRefresh = useCallback(() => {
    refetch();
    refetchScheduler();
  }, [refetch, refetchScheduler]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crawl Jobs</h1>
          <p className="text-gray-500">Manage and monitor crawling tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            href="/jobs/create"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Job
          </Link>
        </div>
      </div>

      {/* Scheduler Status Card */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Scheduler Status
          </h2>
        </div>
        <div className="p-6">
          {isLoadingScheduler
            ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              )
            : schedulerStatus
              ? (
                  <div className="space-y-6">
                    {/* Worker Status */}
                    <div>
                      <h3 className="mb-3 text-sm font-medium text-gray-700">
                        Worker Status
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-lg bg-blue-50 p-4">
                          <div className="text-2xl font-bold text-blue-600">
                            {schedulerStatus.workerStatus.running}
                          </div>
                          <div className="text-sm text-blue-600">Running</div>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-4">
                          <div className="text-2xl font-bold text-amber-600">
                            {schedulerStatus.workerStatus.pending}
                          </div>
                          <div className="text-sm text-amber-600">Pending</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-4">
                          <div className="text-2xl font-bold text-gray-600">
                            {schedulerStatus.workerStatus.maxConcurrent}
                          </div>
                          <div className="text-sm text-gray-600">Max Concurrent</div>
                        </div>
                      </div>
                    </div>

                    {/* Active Tasks */}
                    <div>
                      <h3 className="mb-3 text-sm font-medium text-gray-700">
                        Scheduled Tasks
                      </h3>
                      {schedulerStatus.tasks.length === 0
                        ? (
                            <p className="text-sm text-gray-500">
                              No scheduled tasks configured
                            </p>
                          )
                        : (
                            <div className="space-y-2">
                              {schedulerStatus.tasks.map(task => (
                                <div
                                  key={task.name}
                                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-900">
                                        {task.name}
                                      </span>
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                          task.enabled
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}
                                      >
                                        {task.enabled ? 'Enabled' : 'Disabled'}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        {task.cronExpression}
                                      </span>
                                      {task.lastRun && (
                                        <span>
                                          Last run:
                                          {' '}
                                          {formatDateTime(task.lastRun)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    {task.enabled
                                      ? (
                                          <button
                                            onClick={() => stopTaskMutation.mutate(task.name)}
                                            disabled={stopTaskMutation.isPending}
                                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1.5"
                                            title="Stop task"
                                          >
                                            <StopCircle className="h-4 w-4" />
                                            Stop
                                          </button>
                                        )
                                      : (
                                          <button
                                            onClick={() =>
                                              startTaskMutation.mutate(task.name)}
                                            disabled={startTaskMutation.isPending}
                                            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1.5"
                                            title="Start task"
                                          >
                                            <Play className="h-4 w-4" />
                                            Start
                                          </button>
                                        )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                    </div>
                  </div>
                )
              : (
                  <div className="text-center text-sm text-gray-500">
                    Failed to load scheduler status
                  </div>
                )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-sm text-gray-500">
          {jobsData?.pagination?.total ?? 0}
          {' '}
          jobs total
        </span>
      </div>

      {/* Jobs Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Platform
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Records
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading
              ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                    </td>
                  </tr>
                )
              : isError
                ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-red-600"
                      >
                        Failed to load jobs
                        {error instanceof Error ? `: ${error.message}` : ''}
                      </td>
                    </tr>
                  )
                : jobs.length === 0
                  ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-12 text-center text-gray-500"
                        >
                          No jobs found.
                          {' '}
                          <Link
                            href="/jobs/create"
                            className="text-blue-600 hover:underline"
                          >
                            Create one
                          </Link>
                        </td>
                      </tr>
                    )
                  : (
                      jobs.map(job => (
                        <tr key={job.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-500">
                            {shortId(job.id)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{job.name}</div>
                            <div className="text-sm text-gray-500">{job.job_type}</div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                              {job.platform}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <StatusBadge status={job.status} />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {job.statistics?.records_extracted ?? 0}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {formatDateTime(job.created_at)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {job.status === 'pending' && (
                                <button
                                  onClick={() => startMutation.mutate(job.id)}
                                  disabled={startMutation.isPending}
                                  className="rounded-lg bg-emerald-500 p-2 text-white hover:bg-emerald-600 disabled:opacity-50"
                                  title="Start job"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                              )}
                              {job.status === 'running' && (
                                <button
                                  onClick={() => {
                                  // eslint-disable-next-line no-alert
                                    if (confirm('Cancel this job?')) {
                                      cancelMutation.mutate(job.id);
                                    }
                                  }}
                                  disabled={cancelMutation.isPending}
                                  className="rounded-lg bg-red-500 p-2 text-white hover:bg-red-600 disabled:opacity-50"
                                  title="Cancel job"
                                >
                                  <StopCircle className="h-4 w-4" />
                                </button>
                              )}
                              <Link
                                href={`/jobs/${job.id}`}
                                className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Status config moved outside component to avoid recreation on each render
const STATUS_CONFIG: Record<
  string,
  { icon: React.ReactNode; className: string }
> = {
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    className: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  running: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    className: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  completed: {
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    className: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  failed: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  cancelled: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    className: 'bg-gray-50 text-gray-600 border-gray-200',
  },
};

const StatusBadge = React.memo(({
  status,
}: {
  status: string;
}) => {
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.cancelled!;
  const { icon, className } = statusConfig;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {icon}
      {status}
    </span>
  );
});
