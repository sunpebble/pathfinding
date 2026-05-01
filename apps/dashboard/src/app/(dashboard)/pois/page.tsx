'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import {
  DashboardCard,
  DashboardEmptyState,
  DashboardPageHeader,
  DashboardToolbar,
} from '@/components/ui/dashboard-primitives';
import { getPOIs } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

export default function POIsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(0);
  const limit = 12;

  const {
    data: poisData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['pois', searchQuery, category, city, page],
    queryFn: () =>
      getPOIs({
        query: searchQuery || undefined,
        category: category || undefined,
        city: city || undefined,
        limit,
        offset: page * limit,
      }),
  });

  const pois = poisData?.data || [];
  const total = poisData?.pagination?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <DashboardPageHeader
        title="兴趣点"
        description="浏览和搜索标准化的兴趣点"
        icon={MapPin}
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

      {/* Search Filters */}
      <form
        onSubmit={handleSearch}
        className="dashboard-surface rounded-2xl p-4 backdrop-blur-sm"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索兴趣点..."
              className="dashboard-control w-full py-2 pl-10 pr-3"
            />
          </div>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
            className="dashboard-control"
          >
            <option value="">全部分类</option>
            <option value="restaurant">餐厅</option>
            <option value="hotel">酒店</option>
            <option value="attraction">景点</option>
            <option value="shopping">购物</option>
            <option value="transportation">交通</option>
          </select>
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="城市..."
            className="dashboard-control"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-700 focus-explorer"
          >
            搜索
          </button>
        </div>
      </form>

      {/* Results Count */}
      <DashboardToolbar className="justify-between">
        <div className="text-sm text-stone-500">
          Showing
          {' '}
          {pois.length}
          {' '}
          of
          {' '}
          {total}
          {' '}
          POIs
        </div>
      </DashboardToolbar>

      {/* POI Grid */}
      {isLoading
        ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )
        : pois.length === 0
          ? (
              <DashboardEmptyState
                icon={MapPin}
                title="未找到兴趣点"
                description="尝试调整搜索条件"
              />
            )
          : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pois.map(poi => (
                  <POICard key={poi.id} poi={poi} />
                ))}
              </div>
            )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            上一页
          </button>
          <span className="text-sm text-stone-500">
            第
            {' '}
            {page + 1}
            {' '}
            页 / 共
            {' '}
            {totalPages}
            {' '}
            页
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:opacity-50"
          >
            下一页
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

interface POICardProps {
  poi: {
    id: string;
    name: string;
    name_en?: string;
    category: string;
    subcategory?: string;
    address?: string;
    city?: string;
    rating_overall?: number;
    rating_count: number;
    phone?: string;
    website?: string;
    operating_hours?: Record<string, { open: string; close: string }>;
    quality_score: number;
    completeness_score: number;
    sources: Array<{ platform: string }>;
    created_at: string;
  };
}

function POICard({ poi }: POICardProps) {
  const qualityPercentage = Math.round(poi.quality_score * 100);
  const qualityColor
    = qualityPercentage >= 70
      ? 'text-emerald-600 bg-emerald-50'
      : qualityPercentage >= 40
        ? 'text-amber-600 bg-amber-50'
        : 'text-red-600 bg-red-50';

  return (
    <DashboardCard className="p-5 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[var(--dashboard-shadow)]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-stone-900">{poi.name}</h3>
          {poi.name_en && (
            <p className="text-sm text-stone-500">{poi.name_en}</p>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${qualityColor}`}
        >
          {qualityPercentage}
          %
        </span>
      </div>

      {/* Category */}
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          {poi.category}
        </span>
        {poi.subcategory && (
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-stone-200">
            {poi.subcategory}
          </span>
        )}
      </div>

      {/* Address */}
      {poi.address && (
        <div className="mt-3 flex items-start gap-2 text-sm text-stone-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
          <span className="line-clamp-2">{poi.address}</span>
        </div>
      )}

      {/* Rating */}
      {poi.rating_overall && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 text-amber-400" />
          <span className="font-medium text-stone-900">
            {poi.rating_overall.toFixed(1)}
          </span>
          <span className="text-stone-500">
            (
            {poi.rating_count}
            {' '}
            条评价)
          </span>
        </div>
      )}

      {/* Contact Info */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
        {poi.phone && (
          <div className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" />
            <span>{poi.phone}</span>
          </div>
        )}
        {poi.website && (
          <a
            href={poi.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-emerald-700 hover:underline"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>网站</span>
          </a>
        )}
        {poi.operating_hours && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>营业时间</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
        <div className="flex items-center gap-1.5">
          {poi.sources.map((source, idx) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={`source-${source.platform}-${idx}`}
              className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600"
            >
              {source.platform}
            </span>
          ))}
        </div>
        <span className="text-xs text-stone-400">
          {formatDateTime(poi.created_at)}
        </span>
      </div>
    </DashboardCard>
  );
}
