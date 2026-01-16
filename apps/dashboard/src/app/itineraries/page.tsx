'use client';

import { api } from '@pathfinding/convex';
import { useQuery } from 'convex/react';
import { Calendar, Eye, MapPin, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// For development - in production this would come from auth
const TEST_USER_ID = 'test-user-1';

interface Itinerary {
  _id: string;
  title: string;
  cityName?: string;
  startDate: string;
  endDate: string;
  visibility: 'private' | 'team' | 'public';
  coverImageUrl?: string;
  daysCount: number;
  _creationTime: number;
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const colors: Record<string, string> = {
    private: 'bg-gray-100 text-gray-800',
    team: 'bg-blue-100 text-blue-800',
    public: 'bg-green-100 text-green-800',
  };
  const labels: Record<string, string> = {
    private: 'Private',
    team: 'Team',
    public: 'Public',
  };
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium',
        colors[visibility] || 'bg-gray-100 text-gray-800'
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

function ItineraryCard({ itinerary }: { itinerary: Itinerary }) {
  return (
    <Link href={`/itineraries/${itinerary._id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer">
        <div className="flex gap-4">
          {/* Cover Image */}
          {itinerary.coverImageUrl && (
            <div className="flex-shrink-0">
              <img
                src={itinerary.coverImageUrl}
                alt={itinerary.title}
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
                {itinerary.title}
              </h3>
              <VisibilityBadge visibility={itinerary.visibility} />
            </div>

            {/* Location & Dates */}
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
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
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {itinerary.daysCount}{' '}
                {itinerary.daysCount === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ItinerariesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const result = useQuery(api.itineraries.listByUser, {
    userId: TEST_USER_ID,
    page,
    pageSize,
  });

  const itineraries = result?.data || [];
  const total = result?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Client-side search filter
  const filteredItineraries = searchQuery
    ? itineraries.filter(
        (itinerary) =>
          itinerary.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          itinerary.cityName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : itineraries;

  const isLoading = result === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" />
            My Itineraries
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? 'itinerary' : 'itineraries'} total
          </p>
        </div>

        <Link
          href="/itineraries/new"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          Create Itinerary
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search itineraries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredItineraries.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No itineraries found' : 'No itineraries yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Create your first itinerary to start planning your trip'}
          </p>
          {!searchQuery && (
            <Link
              href="/itineraries/new"
              className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Create Itinerary
            </Link>
          )}
        </div>
      )}

      {/* Itineraries Grid */}
      {!isLoading && filteredItineraries.length > 0 && (
        <div className="space-y-4">
          {filteredItineraries.map((itinerary) => (
            <ItineraryCard key={itinerary._id} itinerary={itinerary} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
