'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  MapPin,
  Play,
  Settings,
  StopCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { cancelCrawlJob, getCrawlJob, startCrawlJob } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['crawl-job', id],
    queryFn: () => getCrawlJob(id),
    refetchInterval: query =>
      query.state.data?.status === 'running' ? 5000 : false,
  });

  const startMutation = useMutation({
    mutationFn: startCrawlJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawl-job', id] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelCrawlJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawl-job', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Failed to load job
        </h2>
        {error instanceof Error && (
          <p className="mt-2 text-sm text-gray-500">{error.message}</p>
        )}
        <Link
          href="/jobs"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          Back to Jobs
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Job not found</h2>
        <Link
          href="/jobs"
          className="mt-4 inline-block text-blue-600 hover:underline"
        >
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/jobs"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Back to Jobs"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.name}</h1>
            <p className="font-mono text-sm text-gray-500">{job.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {job.status === 'pending' && (
            <button
              onClick={() => startMutation.mutate(job.id)}
              disabled={startMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Start Job
            </button>
          )}
          {job.status === 'running' && (
            <button
              onClick={() => {
                // eslint-disable-next-line no-alert
                if (window.confirm('Are you sure you want to cancel this job? This action cannot be undone.')) {
                  cancelMutation.mutate(job.id);
                }
              }}
              disabled={cancelMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <StopCircle className="h-4 w-4" />
              Cancel Job
            </button>
          )}
          <StatusBadge status={job.status} size="lg" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Records Extracted"
          value={job.statistics?.records_extracted ?? 0}
          icon={<BarChart3 className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Requests Failed"
          value={job.statistics?.requests_failed ?? 0}
          icon={<XCircle className="h-5 w-5" />}
          color="red"
        />
        <StatCard
          title="Requests Success"
          value={job.statistics?.requests_success ?? 0}
          icon={<MapPin className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title="Platform"
          value={job.platform}
          icon={<Settings className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Job Info */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Job Information
          </h2>
          <dl className="space-y-4">
            <InfoRow label="ID" value={job.id} mono />
            <InfoRow label="Name" value={job.name} />
            <InfoRow label="Type" value={job.job_type} />
            <InfoRow label="Platform" value={job.platform} />
            <InfoRow label="Created" value={formatDateTime(job.created_at)} />
            <InfoRow label="Updated" value={formatDateTime(job.updated_at)} />
            {job.schedule_cron && (
              <InfoRow label="Schedule" value={job.schedule_cron} mono />
            )}
            {job.last_run_at && (
              <InfoRow
                label="Last Run"
                value={formatDateTime(job.last_run_at)}
              />
            )}
          </dl>
        </div>

        {/* Configuration */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Configuration
          </h2>
          <div className="space-y-4">
            {job.config?.categories && job.config.categories.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Categories
                </dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {job.config.categories.map(cat => (
                    <span
                      key={cat}
                      className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                    >
                      {cat}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {job.config?.geographic_scope?.cities
              && job.config.geographic_scope.cities.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Cities</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {job.config.geographic_scope.cities.map(city => (
                    <span
                      key={city}
                      className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                    >
                      {city}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {job.config?.rate_limit && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Rate Limit
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {job.config.rate_limit.requests_per_second}
                  {' '}
                  req/s,
                  {' '}
                  {job.config.rate_limit.max_concurrent}
                  {' '}
                  concurrent
                </dd>
              </div>
            )}
          </div>

          {/* Raw Config */}
          <div className="mt-6">
            <dt className="text-sm font-medium text-gray-500">Raw Config</dt>
            <dd className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-4">
              <pre className="text-xs text-gray-700">
                {JSON.stringify(job.config, null, 2)}
              </pre>
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'red' | 'emerald' | 'purple';
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd
        className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''} truncate`}
      >
        {value}
      </dd>
    </div>
  );
}
