'use client';

import type { TravelGuide } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Search,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  DashboardCard,
  DashboardEmptyState,
  DashboardLoadingState,
  DashboardPageHeader,
  DashboardToolbar,
} from '@/components/ui/dashboard-primitives';
import { PlatformBadge } from '@/components/ui/platform-badge';
import { getTravelGuides } from '@/lib/api';
import { cn } from '@/lib/utils';

const PLATFORMS = [
  { value: '', label: '全部平台' },
  { value: 'ctrip', label: '携程' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'weibo', label: '微博' },
  { value: 'tongcheng', label: '同程旅行' },
  { value: 'mafengwo', label: '马蜂窝' },
  { value: 'qunar', label: '去哪儿' },
];

function QualityScore({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const color
    = score >= 0.7
      ? 'text-green-600'
      : score >= 0.4
        ? 'text-yellow-600'
        : 'text-gray-500';
  return (
    <div className={cn('flex items-center gap-1', color)}>
      <Star className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">
        {percentage}
        %
      </span>
    </div>
  );
}

function GuideCard({ guide }: { guide: TravelGuide }) {
  return (
    <DashboardCard className="cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[var(--dashboard-shadow)]">
      <div className="flex gap-4">
        {/* Cover Image */}
        {guide.cover_image_url && (
          <div className="flex-shrink-0">
            <img
              src={guide.cover_image_url}
              alt={guide.title || '游记封面'}
              className="h-24 w-24 rounded-xl object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 font-medium text-stone-900">
              {guide.title || '未命名游记'}
            </h3>
            <PlatformBadge platform={guide.source_platform} />
          </div>

          {/* Author & Quality */}
          <div className="mt-1 flex items-center gap-3 text-sm text-stone-500">
            {guide.author_name && <span>{guide.author_name}</span>}
            <QualityScore score={guide.quality_score} />
          </div>

          {/* Destinations */}
          {guide.destinations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {guide.destinations.slice(0, 3).map(dest => (
                <span
                  key={dest}
                  className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200"
                >
                  {dest}
                </span>
              ))}
              {guide.destinations.length > 3 && (
                <span className="text-xs text-stone-400">
                  +
                  {guide.destinations.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {guide.likes_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {guide.views_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {guide.comments_count.toLocaleString()}
            </span>
            {guide.source_url && (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(
                    guide.source_url,
                    '_blank',
                    'noopener,noreferrer',
                  );
                }}
                className="ml-auto flex cursor-pointer items-center gap-1 text-emerald-700 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                来源
              </span>
            )}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export default function GuidesPage() {
  const [platform, setPlatform] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['guides', platform, page, searchQuery],
    queryFn: () =>
      getTravelGuides({
        platforms: platform || undefined,
        search: searchQuery || undefined,
        limit: pageSize,
        offset: page * pageSize,
        sort: 'quality_score',
        order: 'desc',
      }),
  });

  const guides = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardPageHeader
        title="旅行游记"
        icon={BookOpen}
        description={`${total.toLocaleString()} 篇来自多平台的游记`}
      />

      {/* Filters */}
      <DashboardToolbar>
        {/* Search */}
        <div className="relative w-full sm:max-w-md sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索游记..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="dashboard-control w-full py-2 pl-10 pr-4"
          />
        </div>

        {/* Platform Filter */}
        <select
          value={platform}
          onChange={(e) => {
            setPlatform(e.target.value);
            setPage(0);
          }}
          className="dashboard-control"
        >
          {PLATFORMS.map(p => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </DashboardToolbar>

      {/* Content */}
      {isLoading && (
        <DashboardLoadingState label="加载游记中" />
      )}
      {!isLoading && error && (
        <DashboardCard className="border-red-200 bg-red-50 p-4 text-red-700">
          加载游记失败，请重试。
        </DashboardCard>
      )}
      {!isLoading && !error && guides.length === 0 && (
        <DashboardEmptyState
          icon={BookOpen}
          title="未找到游记"
          description="启动抓取任务来收集旅行游记"
        />
      )}
      {!isLoading && !error && guides.length > 0 && (
        <>
          {/* Guides Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {guides.map(guide => (
              <Link key={guide.id} href={`/guides/${guide.id}`}>
                <GuideCard guide={guide} />
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="dashboard-surface flex items-center justify-between rounded-2xl px-4 py-3">
              <p className="text-sm text-stone-500">
                Showing
                {' '}
                {page * pageSize + 1}
                {' '}
                -
                {' '}
                {Math.min((page + 1) * pageSize, total)}
                {' '}
                of
                {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
