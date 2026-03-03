'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  Clock,
  Database,
  ListTodo,
  Loader2,
  MapPin,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useHealthStatus } from '@/hooks/use-health-status';
import { getCrawlJobs, getPOIs, getTrainingDatasets } from '@/lib/api';

export default function OverviewPage() {
  const { data: health } = useHealthStatus();
  const { data: jobsData } = useQuery({
    queryKey: ['crawl-jobs-overview'],
    queryFn: () => getCrawlJobs({ limit: 5 }),
  });
  const { data: poisData } = useQuery({
    queryKey: ['pois-overview'],
    queryFn: () => getPOIs({ limit: 1 }),
  });
  const { data: datasetsData } = useQuery({
    queryKey: ['datasets-overview'],
    queryFn: () => getTrainingDatasets({ limit: 1 }),
  });

  // Calculate job statistics
  const jobs = jobsData?.data || [];
  const runningJobs = jobs.filter(j => j.status === 'running').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500">
          Monitor your crawler service and data pipeline
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Jobs */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Jobs</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {jobsData?.pagination.total ?? '-'}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <ListTodo className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              {completedJobs}
              {' '}
              completed
            </span>
            <span className="flex items-center gap-1 text-blue-600">
              <Loader2 className="h-4 w-4" />
              {runningJobs}
              {' '}
              running
            </span>
          </div>
        </div>

        {/* Total POIs */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Normalized POIs
              </p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {poisData?.pagination.total ?? '-'}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3">
              <MapPin className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <Link
            href="/pois"
            className="mt-4 inline-block text-sm text-emerald-600 hover:underline"
          >
            View all POIs →
          </Link>
        </div>

        {/* Training Datasets */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Datasets</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {datasetsData?.pagination.total ?? '-'}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Database className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <Link
            href="/datasets"
            className="mt-4 inline-block text-sm text-purple-600 hover:underline"
          >
            View datasets →
          </Link>
        </div>

        {/* Service Status */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Service Status
              </p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {health?.status === 'ok' || health?.status === 'healthy'
                  ? 'Online'
                  : 'Offline'}
              </p>
            </div>
            <div
              className={`rounded-full p-3 ${
                health?.status === 'ok' || health?.status === 'healthy'
                  ? 'bg-emerald-100'
                  : 'bg-red-100'
              }`}
            >
              {health?.status === 'ok' || health?.status === 'healthy'
                ? (
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  )
                : (
                    <XCircle className="h-6 w-6 text-red-600" />
                  )}
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Crawler API at localhost:3001
          </p>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
          <Link href="/jobs" className="text-sm text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {jobs.length === 0
            ? (
                <div className="p-6 text-center text-gray-500">
                  No jobs found.
                  {' '}
                  <Link
                    href="/jobs/create"
                    className="text-blue-600 hover:underline"
                  >
                    Create one
                  </Link>
                </div>
              )
            : (
                jobs.map(job => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <StatusIcon status={job.status} />
                      <div>
                        <p className="font-medium text-gray-900">{job.name}</p>
                        <p className="text-sm text-gray-500">
                          {job.platform}
                          {' '}
                          •
                          {job.statistics?.records_extracted ?? 0}
                          {' '}
                          records
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={job.status} />
                      <Link
                        href={`/jobs/${job.id}`}
                        className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))
              )}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    case 'running':
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'pending':
      return <Clock className="h-5 w-5 text-amber-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-400" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600 border border-amber-200',
    running: 'bg-blue-50 text-blue-600 border border-blue-200',
    completed: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    failed: 'bg-red-50 text-red-600 border border-red-200',
    cancelled: 'bg-gray-50 text-gray-600 border border-gray-200',
  };

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.cancelled}`}
    >
      {status}
    </span>
  );
}
