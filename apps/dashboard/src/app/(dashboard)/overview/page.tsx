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
import {
  DashboardCard,
  DashboardPageHeader,
  DashboardTableShell,
  MetricCard,
} from '@/components/ui/dashboard-primitives';
import { StatusBadge } from '@/components/ui/status-badge';
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
      <DashboardPageHeader
        title="仪表盘概览"
        description="监控抓取服务和数据管道"
        icon={ListTodo}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="总任务数"
          value={jobsData?.pagination?.total ?? '-'}
          icon={ListTodo}
          tone="blue"
          footer={(
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                {completedJobs}
                {' '}
                已完成
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <Loader2 className="h-4 w-4" />
                {runningJobs}
                {' '}
                运行中
              </span>
            </div>
          )}
        />

        <MetricCard
          label="标准化兴趣点"
          value={poisData?.pagination?.total ?? '-'}
          icon={MapPin}
          tone="emerald"
          footer={(
            <Link
              href="/pois"
              className="inline-block text-sm font-medium text-emerald-700 hover:underline"
            >
              查看全部兴趣点 →
            </Link>
          )}
        />

        <MetricCard
          label="数据集"
          value={datasetsData?.pagination?.total ?? '-'}
          icon={Database}
          tone="purple"
          footer={(
            <Link
              href="/datasets"
              className="inline-block text-sm font-medium text-purple-700 hover:underline"
            >
              查看数据集 →
            </Link>
          )}
        />

        <MetricCard
          label="服务状态"
          value={health?.status === 'ok' || health?.status === 'healthy'
            ? '在线'
            : '离线'}
          icon={health?.status === 'ok' || health?.status === 'healthy' ? CheckCircle : XCircle}
          tone={health?.status === 'ok' || health?.status === 'healthy' ? 'emerald' : 'red'}
          footer={(
            <p className="text-sm text-stone-500">
              抓取 API 位于 localhost:3001
            </p>
          )}
        />
      </div>

      {/* Recent Jobs */}
      <DashboardTableShell>
        <div className="flex items-center justify-between border-b border-stone-200/70 p-6">
          <h2 className="text-lg font-semibold text-stone-950">最近任务</h2>
          <Link href="/jobs" className="text-sm font-medium text-emerald-700 hover:underline">
            查看全部 →
          </Link>
        </div>
        <div className="divide-y divide-stone-100">
          {jobs.length === 0
            ? (
                <DashboardCard className="m-6 text-center text-stone-500">
                  暂无任务。
                  {' '}
                  <Link
                    href="/jobs/create"
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    创建一个
                  </Link>
                </DashboardCard>
              )
            : (
                jobs.map(job => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-emerald-50/40"
                  >
                    <div className="flex items-center gap-4">
                      <StatusIcon status={job.status} />
                      <div>
                        <p className="font-medium text-stone-900">{job.name}</p>
                        <p className="text-sm text-stone-500">
                          {job.platform}
                          {' '}
                          •
                          {job.statistics?.records_extracted ?? 0}
                          {' '}
                          条记录
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={job.status} showIcon={false} />
                      <Link
                        href={`/jobs/${job.id}`}
                        className="rounded-xl px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100"
                      >
                        查看
                      </Link>
                    </div>
                  </div>
                ))
              )}
        </div>
      </DashboardTableShell>
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
