'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  CheckSquare,
  Download,
  Globe,
  Loader2,
  MapPin,
  Play,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  DashboardCard,
  DashboardLoadingState,
  DashboardPageHeader,
  DashboardTableShell,
  MetricCard,
} from '@/components/ui/dashboard-primitives';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { createBackfillJobs, discoverGuides, executeBackfillJobs, executeFullBackfill, getBackfillAnalysis, importGuides } from '@/lib/api';

export default function BackfillPage() {
  const queryClient = useQueryClient();
  const [selectedFieldGuides, setSelectedFieldGuides] = useState<Set<number>>(() => new Set());
  const [selectedDestinations, setSelectedDestinations] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<{
    executed: number;
    totalProcessed: number;
    totalFailed: number;
  } | null>(null);

  // Guide discovery state
  const [activeTab, setActiveTab] = useState<'gaps' | 'discover'>('gaps');
  const [discoveryPlatform, setDiscoveryPlatform] = useState('mafengwo');
  const [discoveryCity, setDiscoveryCity] = useState('');
  const [discoveredGuides, setDiscoveredGuides] = useState<Array<{ url: string; title?: string }>>([]);
  const [selectedGuidesToImport, setSelectedGuidesToImport] = useState<Set<string>>(() => new Set());
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
    skipped: number;
  } | null>(null);

  const {
    data: analysis,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['backfill-analysis'],
    queryFn: getBackfillAnalysis,
  });

  const createMutation = useMutation({
    mutationFn: createBackfillJobs,
    onSuccess: (result) => {
      setSelectedFieldGuides(new Set());
      setSelectedDestinations(new Set());
      setSuccessMessage(`成功创建 ${result.jobsCreated} 个补齐任务`);
      queryClient.invalidateQueries({ queryKey: ['backfill-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['crawl-jobs'] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccessMessage(null);
    },
  });

  const executeMutation = useMutation({
    mutationFn: executeBackfillJobs,
    onSuccess: (result) => {
      setExecutionResult(result);
      setSuccessMessage(`执行完成：${result.executed} 个任务，处理 ${result.totalProcessed} 条，失败 ${result.totalFailed} 条`);
      queryClient.invalidateQueries({ queryKey: ['backfill-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['crawl-jobs'] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setExecutionResult(null);
    },
  });

  const fullBackfillMutation = useMutation({
    mutationFn: executeFullBackfill,
    onSuccess: (result) => {
      setExecutionResult(result.execution);
      setSuccessMessage(
        `全量补齐完成：发现 ${result.analysis.totalFieldGaps} 个字段缺口 + ${result.analysis.totalDestinationGaps} 个目的地缺口，执行了 ${result.execution.executed} 个任务`,
      );
      queryClient.invalidateQueries({ queryKey: ['backfill-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['crawl-jobs'] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setExecutionResult(null);
    },
  });

  const discoverMutation = useMutation({
    mutationFn: ({ platform, city }: { platform: string; city: string }) => discoverGuides(platform, city),
    onSuccess: (result) => {
      setDiscoveredGuides(result.newGuides);
      setSuccessMessage(`发现 ${result.newGuides.length} 篇新游记（共找到 ${result.totalFound} 篇，已存在 ${result.existingCount} 篇）`);
    },
    onError: (err: Error) => {
      setError(err.message);
      setDiscoveredGuides([]);
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ platform, urls }: { platform: string; urls: string[] }) => importGuides(platform, urls),
    onSuccess: (result) => {
      setImportResult(result);
      setSuccessMessage(`导入完成：成功 ${result.imported} 篇，失败 ${result.failed} 篇，跳过 ${result.skipped} 篇`);
      setSelectedGuidesToImport(new Set());
      queryClient.invalidateQueries({ queryKey: ['backfill-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['crawl-jobs'] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setImportResult(null);
    },
  });

  const toggleFieldGuide = (id: number) => {
    setSelectedFieldGuides((prev) => {
      const next = new Set(prev);
      if (next.has(id))
        next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDestination = (name: string) => {
    setSelectedDestinations((prev) => {
      const next = new Set(prev);
      if (next.has(name))
        next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleCreateJobs = () => {
    setError(null);
    setSuccessMessage(null);
    createMutation.mutate({
      fieldGapGuideIds: selectedFieldGuides.size > 0 ? Array.from(selectedFieldGuides) : undefined,
      destinationGapCities: selectedDestinations.size > 0 ? Array.from(selectedDestinations) : undefined,
    });
  };

  const totalSelected = selectedFieldGuides.size + selectedDestinations.size;

  if (isLoading) {
    return (
      <DashboardLoadingState label="正在加载补齐分析" />
    );
  }

  if (isError) {
    return (
      <DashboardCard className="flex min-h-52 items-center justify-center text-red-600">
        加载数据失败，请稍后重试
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardPageHeader
        title="数据补齐"
        description="分析数据缺口并生成爬取任务，补齐缺失数据"
        icon={BarChart3}
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
            <button
              onClick={() => executeMutation.mutate()}
              disabled={executeMutation.isPending || fullBackfillMutation.isPending}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 focus-explorer"
            >
              {executeMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Play className="h-4 w-4" />}
              执行所有任务
            </button>
            <button
              onClick={() => fullBackfillMutation.mutate()}
              disabled={executeMutation.isPending || fullBackfillMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus-explorer"
            >
              {fullBackfillMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RefreshCw className="h-4 w-4" />}
              一键填充所有
            </button>
            <button
              onClick={handleCreateJobs}
              disabled={totalSelected === 0 || createMutation.isPending || executeMutation.isPending || fullBackfillMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-900/10 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-explorer"
            >
              {createMutation.isPending
                ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )
                : (
                    <Plus className="h-4 w-4" />
                  )}
              生成任务 (
              {totalSelected}
              )
            </button>
          </>
        )}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
          {successMessage}
        </div>
      )}

      {executionResult && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="已执行任务" value={executionResult.executed} icon={Play} tone="blue" />
          <MetricCard label="已处理" value={executionResult.totalProcessed} icon={CheckSquare} tone="emerald" />
          <MetricCard label="失败" value={executionResult.totalFailed} icon={RefreshCw} tone="red" />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200/70">
        <button
          onClick={() => setActiveTab('gaps')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'gaps'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          数据补齐
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'discover'
              ? 'border-b-2 border-emerald-600 text-emerald-700'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          发现游记
        </button>
      </div>

      {activeTab === 'gaps' && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="字段缺口" value={analysis?.totalFieldGaps ?? 0} icon={BarChart3} tone="amber" />
            <MetricCard label="空白目的地" value={analysis?.totalDestinationGaps ?? 0} icon={Globe} tone="blue" />
          </div>

          {/* Field Gap Table */}
          <DashboardTableShell>
            <div className="border-b border-stone-200/70 bg-stone-50/80 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
                <CheckSquare className="h-5 w-5 text-emerald-600" />
                字段缺口 — 缺失数据的游记
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200/70">
                <thead className="bg-stone-50/90">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">选择</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">标题</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">平台</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">缺失字段</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">缺失数量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/70 bg-white/70">
                  {analysis?.fieldGaps.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-stone-500">
                        未发现字段缺口 — 所有游记数据完整！
                      </td>
                    </tr>
                  )}
                  {analysis?.fieldGaps.map(gap => (
                    <tr key={gap.guideId} className="transition-colors hover:bg-emerald-50/40">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedFieldGuides.has(gap.guideId)}
                          onChange={() => toggleFieldGuide(gap.guideId)}
                          className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-900">{gap.guideId}</td>
                      <td className="px-6 py-4 text-sm font-medium text-stone-900">{gap.title}</td>
                      <td className="px-6 py-4 text-sm text-stone-500">{gap.platform}</td>
                      <td className="px-6 py-4 text-sm text-stone-500">
                        <div className="flex flex-wrap gap-1">
                          {gap.missingFields.map(f => (
                            <span key={f} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 ring-1 ring-stone-200">
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-900">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          gap.missingCount >= 5
                            ? 'bg-red-100 text-red-700'
                            : gap.missingCount >= 3
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                        >
                          {gap.missingCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardTableShell>

          {/* Destination Gap Table */}
          <DashboardTableShell>
            <div className="border-b border-stone-200/70 bg-stone-50/80 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
                <MapPin className="h-5 w-5 text-emerald-600" />
                目的地缺口 — 没有游记的城市
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200/70">
                <thead className="bg-stone-50/90">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">选择</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">城市</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">国家</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">当前游记数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/70 bg-white/70">
                  {analysis?.destinationGaps.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-stone-500">
                        未发现目的地缺口 — 所有城市都有游记！
                      </td>
                    </tr>
                  )}
                  {analysis?.destinationGaps.map(gap => (
                    <tr key={gap.cityName} className="transition-colors hover:bg-emerald-50/40">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDestinations.has(gap.cityName)}
                          onChange={() => toggleDestination(gap.cityName)}
                          className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-stone-900">{gap.cityName}</td>
                      <td className="px-6 py-4 text-sm text-stone-500">{gap.countryCode}</td>
                      <td className="px-6 py-4 text-sm text-stone-900">
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          {gap.guideCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardTableShell>
        </>
      )}

      {activeTab === 'discover' && (
        <div className="space-y-6">
          {/* Discovery Controls */}
          <DashboardCard className="p-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">平台</label>
                <select
                  value={discoveryPlatform}
                  onChange={e => setDiscoveryPlatform(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="mafengwo">马蜂窝 (Mafengwo)</option>
                </select>
              </div>
              <div className="flex-[2] min-w-[200px]">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">城市</label>
                <input
                  type="text"
                  value={discoveryCity}
                  onChange={e => setDiscoveryCity(e.target.value)}
                  placeholder="输入城市名称（如：北京、上海、东京）"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={() => {
                  if (!discoveryCity.trim())
                    return;
                  discoverMutation.mutate({ platform: discoveryPlatform, city: discoveryCity.trim() });
                }}
                disabled={discoverMutation.isPending || !discoveryCity.trim()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-900/10 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-explorer"
              >
                {discoverMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Search className="h-4 w-4" />}
                搜索游记
              </button>
            </div>
          </DashboardCard>

          {importResult && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard label="导入成功" value={importResult.imported} icon={CheckSquare} tone="emerald" />
              <MetricCard label="导入失败" value={importResult.failed} icon={RefreshCw} tone="red" />
              <MetricCard label="已跳过" value={importResult.skipped} icon={Globe} tone="amber" />
            </div>
          )}

          {/* Discovered Guides */}
          {discoveredGuides.length > 0 && (
            <DashboardTableShell>
              <div className="flex items-center justify-between border-b border-stone-200/70 bg-stone-50/80 px-6 py-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-950">
                  <Search className="h-5 w-5 text-emerald-600" />
                  发现的游记 (
                  {discoveredGuides.length}
                  {' '}
                  篇新)
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (selectedGuidesToImport.size === discoveredGuides.length) {
                        setSelectedGuidesToImport(new Set());
                      }
                      else {
                        setSelectedGuidesToImport(new Set(discoveredGuides.map(g => g.url)));
                      }
                    }}
                    className="text-sm font-medium text-emerald-700 hover:underline"
                  >
                    {selectedGuidesToImport.size === discoveredGuides.length ? '取消全选' : '全选'}
                  </button>
                  <button
                    onClick={() => {
                      if (selectedGuidesToImport.size === 0)
                        return;
                      importMutation.mutate({
                        platform: discoveryPlatform,
                        urls: Array.from(selectedGuidesToImport),
                      });
                    }}
                    disabled={selectedGuidesToImport.size === 0 || importMutation.isPending}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 focus-explorer"
                  >
                    {importMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Download className="h-4 w-4" />}
                    导入所选 (
                    {selectedGuidesToImport.size}
                    )
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200/70">
                  <thead className="bg-stone-50/90">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">选择</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">链接</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500">标题</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 bg-white/70">
                    {discoveredGuides.map(guide => (
                      <tr key={guide.url} className="transition-colors hover:bg-emerald-50/40">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedGuidesToImport.has(guide.url)}
                            onChange={() => {
                              setSelectedGuidesToImport((prev) => {
                                const next = new Set(prev);
                                if (next.has(guide.url))
                                  next.delete(guide.url);
                                else next.add(guide.url);
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-500 max-w-md truncate">
                          <a href={guide.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                            {guide.url}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-stone-900">{guide.title || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardTableShell>
          )}

          {discoveredGuides.length === 0 && !discoverMutation.isPending && !discoverMutation.isError && (
            <DashboardCard className="flex min-h-52 items-center justify-center text-stone-500">
              <div className="text-center">
                <Search className="mx-auto mb-3 h-10 w-10 text-stone-300" />
                <p className="text-sm">输入城市名称并点击搜索，发现新的游记</p>
              </div>
            </DashboardCard>
          )}
        </div>
      )}
    </div>
  );
}
