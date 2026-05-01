'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Database,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import {
  DashboardEmptyState,
  DashboardPageHeader,
  DashboardTableShell,
  DashboardToolbar,
} from '@/components/ui/dashboard-primitives';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getTrainingDatasets } from '@/lib/api';
import { formatDateTime, shortId } from '@/lib/utils';

export default function DatasetsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const {
    data: datasetsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['training-datasets', typeFilter, statusFilter],
    queryFn: () =>
      getTrainingDatasets({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        limit: 50,
      }),
  });

  const datasets = datasetsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <DashboardPageHeader
        title="训练数据集"
        description="管理机器学习训练数据导出"
        icon={Database}
        actions={(
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 focus-explorer"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
        )}
      />

      {/* Filters */}
      <DashboardToolbar>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="dashboard-control"
        >
          <option value="">全部类型</option>
          <option value="ner">NER（命名实体识别）</option>
          <option value="classification">分类</option>
          <option value="embedding">嵌入</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="dashboard-control"
        >
          <option value="">全部状态</option>
          <option value="pending">待处理</option>
          <option value="generating">生成中</option>
          <option value="completed">已完成</option>
          <option value="failed">失败</option>
        </select>
        <span className="text-sm text-stone-500">
          {datasetsData?.pagination?.total ?? 0}
          {' '}
          个数据集
        </span>
      </DashboardToolbar>

      {/* Datasets Table */}
      <DashboardTableShell>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-stone-50/90">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">
                  类型
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
                : datasets.length === 0
                  ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-12"
                        >
                          <DashboardEmptyState icon={Database} title="未找到数据集" />
                        </td>
                      </tr>
                    )
                  : (
                      datasets.map(dataset => (
                        <tr key={dataset.id} className="transition-colors hover:bg-emerald-50/40">
                          <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-stone-500">
                            {shortId(dataset.id)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-stone-900">
                              {dataset.name}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                              {dataset.type}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <StatusBadge status={dataset.status} />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-900">
                            {dataset.statistics?.total_records ?? 0}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-stone-500">
                            {formatDateTime(dataset.created_at)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            {dataset.status === 'completed' && dataset.file_path && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => {
                                    // Trigger download via API
                                      const url = `/api/training-datasets/download?id=${dataset.id}`;
                                      window.open(url, '_blank');
                                    }}
                                    className="rounded-xl bg-blue-100 p-2 text-blue-700 transition-colors hover:bg-blue-200"
                                    title="下载数据集"
                                    aria-label="下载数据集"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>下载数据集</TooltipContent>
                              </Tooltip>
                            )}
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
