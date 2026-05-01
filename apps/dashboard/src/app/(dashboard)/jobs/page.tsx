'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Clock,
  Eye,
  ListTodo,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  StopCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import {
  DashboardCard,
  DashboardPageHeader,
  DashboardTableShell,
  DashboardToolbar,
  MetricCard,
} from '@/components/ui/dashboard-primitives';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
      <DashboardPageHeader
        title="爬取任务"
        description="管理和监控爬取任务"
        icon={ListTodo}
        actions={(
          <>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 focus-explorer"
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
            <Link
              href="/jobs/backfill"
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 focus-explorer"
            >
              <BarChart3 className="h-4 w-4" />
              数据补齐
            </Link>
            <Link
              href="/jobs/create"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-700 focus-explorer"
            >
              <Plus className="h-4 w-4" />
              创建任务
            </Link>
          </>
        )}
      />

      {/* Scheduler Status Card */}
      <DashboardCard className="overflow-hidden p-0">
        <div className="border-b border-stone-200/70 bg-stone-50/80 px-6 py-4">
          <h2 className="text-lg font-semibold text-stone-950">
            调度器状态
          </h2>
        </div>
        <div className="p-6">
          {isLoadingScheduler
            ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              )
            : schedulerStatus
              ? (
                  <div className="space-y-6">
                    {/* Worker Status */}
                    <div>
                      <h3 className="mb-3 text-sm font-medium text-gray-700">
                        工作器状态
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <MetricCard label="运行中" value={schedulerStatus.workerStatus.running} icon={Loader2} tone="blue" className="p-4" />
                        <MetricCard label="待执行" value={schedulerStatus.workerStatus.pending} icon={Clock} tone="amber" className="p-4" />
                        <MetricCard label="最大并发" value={schedulerStatus.workerStatus.maxConcurrent} icon={ListTodo} tone="stone" className="p-4" />
                      </div>
                    </div>

                    {/* Active Tasks */}
                    <div>
                      <h3 className="mb-3 text-sm font-medium text-gray-700">
                        定时任务
                      </h3>
                      {schedulerStatus.tasks.length === 0
                        ? (
                            <p className="text-sm text-stone-500">
                              未配置定时任务
                            </p>
                          )
                        : (
                            <div className="space-y-2">
                              {schedulerStatus.tasks.map(task => (
                                <div
                                  key={task.name}
                                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white/70 p-4 shadow-sm"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-stone-900">
                                        {task.name}
                                      </span>
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                          task.enabled
                                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                            : 'bg-stone-100 text-stone-600 ring-1 ring-stone-200'
                                        }`}
                                      >
                                        {task.enabled ? '已启用' : '已禁用'}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-4 text-sm text-stone-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        {task.cronExpression}
                                      </span>
                                      {task.lastRun && (
                                        <span>
                                          上次执行：
                                          {' '}
                                          {formatDateTime(task.lastRun)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="ml-4 flex items-center gap-2">
                                    {task.enabled
                                      ? (
                                          <button
                                            onClick={() => stopTaskMutation.mutate(task.name)}
                                            disabled={stopTaskMutation.isPending}
                                            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
                                            title="停止任务"
                                          >
                                            <StopCircle className="h-4 w-4" />
                                            停止
                                          </button>
                                        )
                                      : (
                                          <button
                                            onClick={() =>
                                              startTaskMutation.mutate(task.name)}
                                            disabled={startTaskMutation.isPending}
                                            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                            title="启动任务"
                                          >
                                            <Play className="h-4 w-4" />
                                            启动
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
                  <div className="text-center text-sm text-stone-500">
                    加载调度器状态失败
                  </div>
                )}
        </div>
      </DashboardCard>

      {/* Filters */}
      <DashboardToolbar>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="dashboard-control"
        >
          <option value="">全部状态</option>
          <option value="pending">待执行</option>
          <option value="running">运行中</option>
          <option value="completed">已完成</option>
          <option value="failed">失败</option>
          <option value="cancelled">已取消</option>
        </select>
        <span className="text-sm text-stone-500">
          共
          {' '}
          {jobsData?.pagination?.total ?? 0}
          {' '}
          个任务
        </span>
      </DashboardToolbar>

      {/* Jobs Table */}
      <DashboardTableShell>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="bg-stone-50/90">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                  平台
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                  记录数
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                  创建时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-stone-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70 bg-white/70">
              {isLoading
                ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
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
                          加载任务失败
                          {error instanceof Error ? `: ${error.message}` : ''}
                        </td>
                      </tr>
                    )
                  : jobs.length === 0
                    ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-6 py-12 text-center text-stone-500"
                          >
                            暂无任务。
                            {' '}
                            <Link
                              href="/jobs/create"
                              className="font-medium text-emerald-700 hover:underline"
                            >
                              创建一个
                            </Link>
                          </td>
                        </tr>
                      )
                    : (
                        jobs.map(job => (
                          <tr key={job.id} className="transition-colors hover:bg-emerald-50/40">
                            <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-stone-500">
                              {shortId(job.id)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-stone-900">{job.name}</div>
                              <div className="text-sm text-stone-500">{job.job_type}</div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 ring-1 ring-stone-200">
                                {job.platform}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <StatusBadge status={job.status} />
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-900">
                              {job.statistics?.records_extracted ?? 0}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                              {formatDateTime(job.created_at)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {job.status === 'pending' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => startMutation.mutate(job.id)}
                                        disabled={startMutation.isPending}
                                        className="rounded-xl bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                                        title="启动任务"
                                        aria-label="启动任务"
                                      >
                                        <Play className="h-4 w-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>启动任务</TooltipContent>
                                  </Tooltip>
                                )}
                                {job.status === 'running' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => {
                                          // eslint-disable-next-line no-alert
                                          if (window.confirm('确定要取消此任务吗？此操作无法撤销。')) {
                                            cancelMutation.mutate(job.id);
                                          }
                                        }}
                                        disabled={cancelMutation.isPending}
                                        className="rounded-xl bg-red-600 p-2 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                        title="取消任务"
                                        aria-label="取消任务"
                                      >
                                        <StopCircle className="h-4 w-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>取消任务</TooltipContent>
                                  </Tooltip>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link
                                      href={`/jobs/${job.id}`}
                                      className="rounded-xl bg-stone-100 p-2 text-stone-600 transition-colors hover:bg-stone-200"
                                      title="查看详情"
                                      aria-label="查看详情"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent>查看详情</TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
            </tbody>
          </table>
        </div>
      </DashboardTableShell>
    </div>
  );
}
