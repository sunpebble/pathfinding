'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  MapPin,
  Play,
  Settings,
  StopCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import {
  DashboardCard,
  DashboardEmptyState,
  DashboardLoadingState,
  DashboardPageHeader,
} from '@/components/ui/dashboard-primitives';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    return <DashboardLoadingState label="加载任务中" />;
  }

  if (isError) {
    return (
      <DashboardEmptyState
        icon={XCircle}
        title="加载任务失败"
        description={error instanceof Error ? error.message : undefined}
        action={(
          <Link
            href="/jobs"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            返回任务列表
          </Link>
        )}
      />
    );
  }

  if (!job) {
    return (
      <DashboardEmptyState
        icon={XCircle}
        title="任务不存在"
        action={(
          <Link href="/jobs" className="text-sm font-medium text-emerald-700 hover:underline">
            返回任务列表
          </Link>
        )}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardPageHeader
        title={job.name}
        description={job.id}
        icon={Settings}
        actions={(
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/jobs"
                  className="rounded-xl border border-stone-200 bg-white p-2 text-stone-600 shadow-sm transition-colors hover:bg-stone-50 focus-explorer"
                  aria-label="返回任务列表"
                  title="返回任务列表"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>返回任务列表</TooltipContent>
            </Tooltip>
            {job.status === 'pending' && (
              <button
                onClick={() => startMutation.mutate(job.id)}
                disabled={startMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50 focus-explorer"
              >
                <Play className="h-4 w-4" />
                启动任务
              </button>
            )}
            {job.status === 'running' && (
              <button
                onClick={() => {
                // eslint-disable-next-line no-alert
                  if (window.confirm('确定要取消此任务吗？此操作不可撤销。')) {
                    cancelMutation.mutate(job.id);
                  }
                }}
                disabled={cancelMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50 focus-explorer"
              >
                <StopCircle className="h-4 w-4" />
                取消任务
              </button>
            )}
            <StatusBadge status={job.status} size="lg" />
          </>
        )}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="已提取记录"
          value={job.statistics?.records_extracted ?? 0}
          icon={<BarChart3 className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="失败请求"
          value={job.statistics?.requests_failed ?? 0}
          icon={<XCircle className="h-5 w-5" />}
          color="red"
        />
        <StatCard
          title="成功请求"
          value={job.statistics?.requests_success ?? 0}
          icon={<MapPin className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title="平台"
          value={job.platform}
          icon={<Settings className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Job Info */}
        <DashboardCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-stone-900">
            任务信息
          </h2>
          <dl className="space-y-4">
            <InfoRow label="ID" value={job.id} mono />
            <InfoRow label="名称" value={job.name} />
            <InfoRow label="类型" value={job.job_type} />
            <InfoRow label="平台" value={job.platform} />
            <InfoRow label="创建时间" value={formatDateTime(job.created_at)} />
            <InfoRow label="更新时间" value={formatDateTime(job.updated_at)} />
            {job.schedule_cron && (
              <InfoRow label="调度" value={job.schedule_cron} mono />
            )}
            {job.last_run_at && (
              <InfoRow
                label="上次运行"
                value={formatDateTime(job.last_run_at)}
              />
            )}
          </dl>
        </DashboardCard>

        {/* Configuration */}
        <DashboardCard className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-stone-900">
            配置
          </h2>
          <div className="space-y-4">
            {job.config?.categories && job.config.categories.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  分类
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
                <dt className="text-sm font-medium text-gray-500">城市</dt>
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
                  速率限制
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {job.config.rate_limit.requests_per_second}
                  {' '}
                  请求/秒，
                  {' '}
                  {job.config.rate_limit.max_concurrent}
                  {' '}
                  并发
                </dd>
              </div>
            )}
          </div>

          {/* Raw Config */}
          <div className="mt-6">
            <dt className="text-sm font-medium text-gray-500">原始配置</dt>
            <dd className="mt-2 overflow-x-auto rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
              <pre className="text-xs text-stone-700">
                {JSON.stringify(job.config, null, 2)}
              </pre>
            </dd>
          </div>
        </DashboardCard>
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
    <div className="dashboard-surface rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
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
      <dt className="text-sm font-medium text-stone-500">{label}</dt>
      <dd
        className={`truncate text-sm text-stone-900 ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
