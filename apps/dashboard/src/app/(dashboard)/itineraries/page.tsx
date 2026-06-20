'use client';

import type { ItinerarySummary } from '@/lib/api/itineraries';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Eye, MapPin, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  DashboardCard,
  DashboardEmptyState,
  DashboardLoadingState,
  DashboardPageHeader,
  DashboardToolbar,
} from '@/components/ui/dashboard-primitives';
import {
  getItineraries,

  normalizeItinerariesResponse,
} from '@/lib/api/itineraries';
import { cn } from '@/lib/utils';
import { useAuthContext as useAuth } from '@/providers/auth-provider';

function VisibilityBadge({ visibility }: { visibility: string }) {
  const colors: Record<string, string> = {
    private: 'bg-gray-100 text-gray-800',
    friends: 'bg-blue-100 text-blue-800',
    public: 'bg-green-100 text-green-800',
  };
  const labels: Record<string, string> = {
    private: '私有',
    friends: '好友',
    public: '公开',
  };
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium',
        colors[visibility] || 'bg-gray-100 text-gray-800',
      )}
    >
      {labels[visibility] || visibility}
    </span>
  );
}

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year:
      start.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  };

  if (startDate === endDate) {
    return start.toLocaleDateString('en-US', options);
  }

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

function ItineraryCard({ itinerary }: { itinerary: ItinerarySummary }) {
  return (
    <Link href={`/itineraries/${itinerary.id}`}>
      <DashboardCard className="cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[var(--dashboard-shadow)]">
        <div className="flex gap-4">
          {/* Cover Image */}
          {itinerary.coverImageUrl && (
            <div className="flex-shrink-0">
              <img
                src={itinerary.coverImageUrl}
                alt={itinerary.title}
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
                {itinerary.title}
              </h3>
              <VisibilityBadge visibility={itinerary.visibility} />
            </div>

            {/* Location & Dates */}
            <div className="mt-2 flex items-center gap-3 text-sm text-stone-600">
              {itinerary.cityName && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {itinerary.cityName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateRange(itinerary.startDate, itinerary.endDate)}
              </span>
            </div>

            {/* Stats */}
            <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {itinerary.daysCount}
                {' '}
                {itinerary.daysCount === 1 ? '天' : '天'}
              </span>
            </div>
          </div>
        </div>
      </DashboardCard>
    </Link>
  );
}

export default function ItinerariesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/signin');
    }
  }, [authLoading, isAuthenticated, router]);

  const result = useQuery({
    queryKey: ['itineraries', user?.id, page, pageSize],
    enabled: Boolean(isAuthenticated && user?.id),
    queryFn: () => getItineraries({
      userId: user!.id,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
  });

  const normalizedResult = result.data
    ? normalizeItinerariesResponse(result.data)
    : undefined;

  const itineraries = normalizedResult?.data ?? [];
  const total = normalizedResult?.pagination.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Client-side search filter
  const filteredItineraries = searchQuery
    ? itineraries.filter(
        itinerary =>
          itinerary.title.toLowerCase().includes(searchQuery.toLowerCase())
          || itinerary.cityName?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : itineraries;

  const isLoading = authLoading || (isAuthenticated && result.isLoading);

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardPageHeader
        title="我的行程"
        icon={Users}
        description={`${total} 个行程`}
        actions={(
          <Link
            href="/itineraries/new"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-700 focus-explorer"
          >
            创建行程
          </Link>
        )}
      />

      {/* Filters */}
      <DashboardToolbar>
        {/* Search */}
        <div className="relative w-full sm:max-w-md sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索行程..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="dashboard-control w-full py-2 pl-10 pr-4"
          />
        </div>
      </DashboardToolbar>

      {/* Loading State */}
      {isLoading && (
        <DashboardLoadingState label="加载行程中" />
      )}

      {/* Empty State */}
      {!isLoading && filteredItineraries.length === 0 && (
        <DashboardEmptyState
          icon={Users}
          title={searchQuery ? '未找到行程' : '暂无行程'}
          description={searchQuery
            ? '尝试调整搜索条件'
            : '创建第一个行程开始规划你的旅行'}
          action={!searchQuery && (
            <Link
              href="/itineraries/new"
              className="inline-block rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus-explorer"
            >
              创建行程
            </Link>
          )}
        />
      )}

      {/* Itineraries Grid */}
      {!isLoading && filteredItineraries.length > 0 && (
        <div className="space-y-4">
          {filteredItineraries.map(itinerary => (
            <ItineraryCard key={itinerary.id} itinerary={itinerary} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="dashboard-surface mx-auto flex w-fit items-center justify-center gap-2 rounded-2xl px-3 py-2">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-stone-600">
            第
            {' '}
            {page}
            {' '}
            页 / 共
            {' '}
            {totalPages}
            {' '}
            页
          </span>
          <button
            type="button"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
