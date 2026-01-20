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
import { getTravelGuides } from '@/lib/api';
import { cn } from '@/lib/utils';

const PLATFORMS = [
  { value: '', label: 'All Platforms' },
  { value: 'ctrip', label: '携程' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'weibo', label: '微博' },
  { value: 'tongcheng', label: '同程旅行' },
  { value: 'mafengwo', label: '马蜂窝' },
  { value: 'qunar', label: '去哪儿' },
];

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    ctrip: 'bg-blue-100 text-blue-800',
    xiaohongshu: 'bg-red-100 text-red-800',
    weibo: 'bg-orange-100 text-orange-800',
    tongcheng: 'bg-purple-100 text-purple-800',
    mafengwo: 'bg-yellow-100 text-yellow-800',
    qunar: 'bg-green-100 text-green-800',
  };
  const names: Record<string, string> = {
    ctrip: '携程',
    xiaohongshu: '小红书',
    weibo: '微博',
    tongcheng: '同程旅行',
    mafengwo: '马蜂窝',
    qunar: '去哪儿',
  };
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium',
        colors[platform] || 'bg-gray-100 text-gray-800'
      )}
    >
      {names[platform] || platform}
    </span>
  );
}

function QualityScore({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const color =
    score >= 0.7
      ? 'text-green-600'
      : score >= 0.4
        ? 'text-yellow-600'
        : 'text-gray-500';
  return (
    <div className={cn('flex items-center gap-1', color)}>
      <Star className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">{percentage}%</span>
    </div>
  );
}

function GuideCard({ guide }: { guide: TravelGuide }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer">
      <div className="flex gap-4">
        {/* Cover Image */}
        {guide.cover_image_url && (
          <div className="flex-shrink-0">
            <img
              src={guide.cover_image_url}
              alt={guide.title || 'Guide cover'}
              className="w-24 h-24 object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-gray-900 line-clamp-2">
              {guide.title || 'Untitled Guide'}
            </h3>
            <PlatformBadge platform={guide.source_platform} />
          </div>

          {/* Author & Quality */}
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {guide.author_name && <span>{guide.author_name}</span>}
            <QualityScore score={guide.quality_score} />
          </div>

          {/* Destinations */}
          {guide.destinations.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {guide.destinations.slice(0, 3).map((dest) => (
                <span
                  key={dest}
                  className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs"
                >
                  {dest}
                </span>
              ))}
              {guide.destinations.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{guide.destinations.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
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
                    'noopener,noreferrer'
                  );
                }}
                className="flex items-center gap-1 text-blue-600 hover:underline ml-auto cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Source
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuidesPage() {
  const [platform, setPlatform] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['guides', platform, page],
    queryFn: () =>
      getTravelGuides({
        platforms: platform || undefined,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-600" />
            Travel Guides
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {total.toLocaleString()} guides from multiple platforms
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Platform Filter */}
        <select
          value={platform}
          onChange={(e) => {
            setPlatform(e.target.value);
            setPage(0);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          Failed to load guides. Please try again.
        </div>
      ) : guides.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No guides found</p>
          <p className="text-sm text-gray-400 mt-1">
            Start a crawl job to collect travel guides
          </p>
        </div>
      ) : (
        <>
          {/* Guides Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {guides.map((guide) => (
              <Link key={guide.id} href={`/guides/${guide.id}`}>
                <GuideCard guide={guide} />
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">
                Showing {page * pageSize + 1} -{' '}
                {Math.min((page + 1) * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
