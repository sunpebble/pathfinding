'use client';

import type { CreateCrawlJobInput } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DashboardPageHeader } from '@/components/ui/dashboard-primitives';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { createCrawlJob } from '@/lib/api';

export default function CreateJobPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createCrawlJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['crawl-jobs'] });
      router.push(`/jobs/${job.id}`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    const categories = formData.get('categories') as string;
    const cities = formData.get('cities') as string;
    const parsedCategories = categories
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);
    const parsedCities = cities
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

    const input: CreateCrawlJobInput = {
      name: formData.get('name') as string,
      platform: formData.get('platform') as string,
      job_type: (formData.get('job_type') as string) || 'full',
      schedule_cron: (formData.get('schedule_cron') as string) || undefined,
      config: {
        categories: parsedCategories.length > 0
          ? parsedCategories
          : undefined,
        geographic_scope: parsedCities.length > 0
          ? { cities: parsedCities }
          : undefined,
        rate_limit: {
          requests_per_second:
            Number.parseFloat(formData.get('rate_limit_rps') as string) || 1,
          max_concurrent:
            Number.parseInt(formData.get('max_concurrent') as string) || 5,
        },
      },
    };

    mutation.mutate(input);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <DashboardPageHeader
        title="创建抓取任务"
        description="配置新的数据抓取任务"
        actions={(
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
        )}
      />

      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="dashboard-surface rounded-2xl p-6 backdrop-blur-sm"
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-stone-700"
              >
                任务名称 *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="dashboard-control mt-1 block w-full"
                placeholder="例如：东京餐厅抓取"
              />
            </div>
            <div>
              <label
                htmlFor="platform"
                className="block text-sm font-medium text-stone-700"
              >
                平台 *
              </label>
              <select
                id="platform"
                name="platform"
                required
                className="dashboard-control mt-1 block w-full"
              >
                <option value="">选择平台...</option>
                <option value="amap">Amap (高德地图)</option>
                <option value="openstreetmap">OpenStreetMap</option>
                <option value="overpass">Overpass API</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="job_type"
                className="block text-sm font-medium text-stone-700"
              >
                任务类型
              </label>
              <select
                id="job_type"
                name="job_type"
                className="dashboard-control mt-1 block w-full"
              >
                <option value="full">全量抓取</option>
                <option value="incremental">增量更新</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="schedule_cron"
                className="block text-sm font-medium text-stone-700"
              >
                定时调度 (Cron)
              </label>
              <input
                type="text"
                id="schedule_cron"
                name="schedule_cron"
                className="dashboard-control mt-1 block w-full"
                placeholder="例如：0 0 * * *（每天午夜）"
              />
            </div>
          </div>

          {/* Categories and Cities */}
          <div>
            <label
              htmlFor="categories"
              className="block text-sm font-medium text-stone-700"
            >
              分类（逗号分隔）
            </label>
            <input
              type="text"
              id="categories"
              name="categories"
              className="dashboard-control mt-1 block w-full"
              placeholder="例如：餐厅、酒店、景点"
            />
          </div>

          <div>
            <label
              htmlFor="cities"
              className="block text-sm font-medium text-stone-700"
            >
              城市（逗号分隔）
            </label>
            <input
              type="text"
              id="cities"
              name="cities"
              className="dashboard-control mt-1 block w-full"
              placeholder="例如：东京、大阪、京都"
            />
          </div>

          {/* Rate Limiting */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="rate_limit_rps"
                className="block text-sm font-medium text-stone-700"
              >
                速率限制（请求/秒）
              </label>
              <input
                type="number"
                id="rate_limit_rps"
                name="rate_limit_rps"
                min="0.1"
                step="0.1"
                defaultValue="1"
                className="dashboard-control mt-1 block w-full"
              />
            </div>
            <div>
              <label
                htmlFor="max_concurrent"
                className="block text-sm font-medium text-stone-700"
              >
                最大并发请求数
              </label>
              <input
                type="number"
                id="max_concurrent"
                name="max_concurrent"
                min="1"
                defaultValue="5"
                className="dashboard-control mt-1 block w-full"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50 focus-explorer"
            >
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              创建任务
            </button>
            <Link
              href="/jobs"
              className="rounded-xl border border-stone-200 bg-white px-6 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 focus-explorer"
            >
              取消
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
