'use client';

import type { CrawlJob } from '@/types/api';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BarChart2,
  CheckCircle,
  Clock,
  ExternalLink,
  PlayCircle,
  Search,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { getCrawlJobs } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    running: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
    completed: 'bg-green-100 text-green-800 border-green-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const icons: Record<string, React.ElementType> = {
    pending: Clock,
    running: PlayCircle,
    completed: CheckCircle,
    failed: XCircle,
    cancelled: XCircle,
  };

  const Icon = icons[status] || AlertCircle;

  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 w-fit',
        styles[status] || 'bg-gray-100 text-gray-800 border-gray-200',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDate(timestamp?: number) {
  if (!timestamp)
    return '-';
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(start?: number, end?: number) {
  if (!start || !end)
    return '-';
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60)
    return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function JobRow({ job }: { job: CrawlJob }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-mono text-xs border border-gray-200">
              {job.platform.slice(0, 2).toUpperCase()}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 group-hover:text-emerald-600 transition-colors">
              <Link href={`/jobs/${job._id}`} className="hover:underline">
                {job.name || 'Untitled Job'}
              </Link>
            </div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">
              {job._id.slice(0, 8)}
              ...
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={job.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-gray-400">
              Start
            </span>
            {formatDate(job.startedAt)}
          </div>
          {job.completedAt && (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-gray-400">
                End
              </span>
              {formatDate(job.completedAt)}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {job.startedAt && job.completedAt
          ? (
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {formatDuration(job.startedAt, job.completedAt)}
              </span>
            )
          : (
              '-'
            )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {job.statistics
          ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3" />
                  <span className="font-medium">
                    {job.statistics.processedCount || 0}
                  </span>
                </div>
                {job.statistics.failedCount > 0 && (
                  <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    <AlertCircle className="h-3 w-3" />
                    <span className="font-medium">
                      {job.statistics.failedCount}
                    </span>
                  </div>
                )}
              </div>
            )
          : (
              '-'
            )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <Link
          href={`/jobs/${job._id}`}
          className="text-gray-400 hover:text-emerald-600 transition-colors inline-block p-2 hover:bg-emerald-50 rounded-lg"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}

export default function JobsPage() {
  const [status, setStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', status, page],
    queryFn: () =>
      getCrawlJobs({
        status: status || undefined,
        limit: pageSize,
        offset: page * pageSize,
      }),
  });

  const jobs = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-emerald-600" />
            Crawl Jobs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and monitor data collection tasks
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <PlayCircle className="h-4 w-4" />
          New Job
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => {
                  setStatus(f.value);
                  setPage(0);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  status === f.value
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 border'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading
          ? (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            )
          : error
            ? (
                <div className="p-8 text-center">
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg inline-block">
                    Failed to load jobs. Please try again.
                  </div>
                </div>
              )
            : jobs.length === 0
              ? (
                  <div className="text-center py-24">
                    <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                      <BarChart2 className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-gray-900 font-medium">No jobs found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Create a new job to start collecting data
                    </p>
                  </div>
                )
              : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Job Info
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Status
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Timeline
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Duration
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Statistics
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {jobs.map(job => (
                            <JobRow key={job._id} job={job} />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50">
                        <p className="text-sm text-gray-500">
                          Showing
                          {' '}
                          <span className="font-medium">
                            {page * pageSize + 1}
                          </span>
                          {' '}
                          to
                          {' '}
                          <span className="font-medium">
                            {Math.min((page + 1) * pageSize, total)}
                          </span>
                          {' '}
                          of
                          {' '}
                          <span className="font-medium">{total}</span>
                          {' '}
                          results
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="px-3 py-1.5 text-sm border rounded-lg bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() =>
                              setPage(Math.min(totalPages - 1, page + 1))}
                            disabled={page >= totalPages - 1}
                            className="px-3 py-1.5 text-sm border rounded-lg bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
      </div>
    </div>
  );
}
