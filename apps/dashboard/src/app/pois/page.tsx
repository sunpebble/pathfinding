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
  const total = poisData?.pagination.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">POIs</h1>
          <p className="text-gray-500">
            Browse and search normalized points of interest
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Search Filters */}
      <form
        onSubmit={handleSearch}
        className="rounded-xl bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search POIs..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="restaurant">Restaurant</option>
            <option value="hotel">Hotel</option>
            <option value="attraction">Attraction</option>
            <option value="shopping">Shopping</option>
            <option value="transportation">Transportation</option>
          </select>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City..."
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </form>

      {/* Results Count */}
      <div className="text-sm text-gray-500">
        Showing {pois.length} of {total} POIs
      </div>

      {/* POI Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : pois.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <MapPin className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No POIs found
          </h3>
          <p className="mt-2 text-gray-500">
            Try adjusting your search filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pois.map((poi) => (
            <POICard key={poi.id} poi={poi} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
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
  const qualityColor =
    qualityPercentage >= 70
      ? 'text-emerald-600 bg-emerald-50'
      : qualityPercentage >= 40
        ? 'text-amber-600 bg-amber-50'
        : 'text-red-600 bg-red-50';

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{poi.name}</h3>
          {poi.name_en && (
            <p className="text-sm text-gray-500">{poi.name_en}</p>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${qualityColor}`}
        >
          {qualityPercentage}%
        </span>
      </div>

      {/* Category */}
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          {poi.category}
        </span>
        {poi.subcategory && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {poi.subcategory}
          </span>
        )}
      </div>

      {/* Address */}
      {poi.address && (
        <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <span className="line-clamp-2">{poi.address}</span>
        </div>
      )}

      {/* Rating */}
      {poi.rating_overall && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 text-amber-400" />
          <span className="font-medium text-gray-900">
            {poi.rating_overall.toFixed(1)}
          </span>
          <span className="text-gray-500">({poi.rating_count} reviews)</span>
        </div>
      )}

      {/* Contact Info */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
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
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Website</span>
          </a>
        )}
        {poi.operating_hours && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Hours available</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-1.5">
          {poi.sources.map((source, idx) => (
            <span
              key={idx}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
            >
              {source.platform}
            </span>
          ))}
        </div>
        <span className="text-xs text-gray-400">
          {formatDateTime(poi.created_at)}
        </span>
      </div>
    </div>
  );
}
