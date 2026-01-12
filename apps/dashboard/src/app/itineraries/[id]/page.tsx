'use client';

import { api } from '@pathfinding/convex';
import { useQuery } from 'convex/react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  Globe,
  Lock,
  MapPin,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

function VisibilityBadge({ visibility }: { visibility: string }) {
  const icons = {
    private: Lock,
    team: Users,
    public: Globe,
  };
  const colors: Record<string, string> = {
    private: 'bg-gray-100 text-gray-800 border-gray-200',
    team: 'bg-blue-100 text-blue-800 border-blue-200',
    public: 'bg-green-100 text-green-800 border-green-200',
  };
  const labels: Record<string, string> = {
    private: 'Private',
    team: 'Team',
    public: 'Public',
  };

  const Icon = icons[visibility as keyof typeof icons] || Lock;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border',
        colors[visibility] || 'bg-gray-100 text-gray-800 border-gray-200'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {labels[visibility] || visibility}
    </span>
  );
}

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  if (startDate === endDate) {
    return start.toLocaleDateString('en-US', { ...options, year: 'numeric' });
  }

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', { ...options, year: 'numeric' })}`;
}

interface Poi {
  id: string;
  name: string;
  category?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
}

interface Item {
  _id: string;
  poiId: string;
  orderIndex: number;
  startTime?: string;
  endTime?: string;
  transportMode?: string;
  notes?: string;
  poi: Poi | null;
}

interface Day {
  _id: string;
  dayNumber: number;
  date: string;
  items: Item[];
}

interface Collaborator {
  _id: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'rejected';
}

interface Itinerary {
  _id: string;
  title: string;
  cityName?: string;
  startDate: string;
  endDate: string;
  visibility: 'private' | 'team' | 'public';
  coverImageUrl?: string;
  daysCount: number;
  days: Day[];
  collaborators: Collaborator[];
  _creationTime: number;
}

function PoiCard({ item }: { item: Item }) {
  const poi = item.poi;
  if (!poi) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-sm text-gray-500">POI not found</p>
      </div>
    );
  }

  const transportModeLabels: Record<string, string> = {
    walking: 'Walk',
    driving: 'Drive',
    transit: 'Transit',
    cycling: 'Cycle',
    taxi: 'Taxi',
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-emerald-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900">{poi.name}</h4>
          {poi.category && (
            <span className="text-xs text-gray-500 mt-1 inline-block capitalize">
              {poi.category}
            </span>
          )}
          {poi.address && (
            <p className="text-sm text-gray-600 mt-2 flex items-start gap-1.5">
              <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{poi.address}</span>
            </p>
          )}
          {(item.startTime || item.endTime) && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                {item.startTime && item.endTime
                  ? `${item.startTime} - ${item.endTime}`
                  : item.startTime || item.endTime}
              </span>
            </div>
          )}
          {item.notes && (
            <p className="text-sm text-gray-600 mt-2 italic">{item.notes}</p>
          )}
          {item.transportMode && (
            <span className="text-xs text-gray-500 mt-2 inline-block">
              Transport:{' '}
              {transportModeLabels[item.transportMode] || item.transportMode}
            </span>
          )}
        </div>
        {poi.rating && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-amber-500">★</span>
            <span className="font-medium">{poi.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DaySection({ day }: { day: Day }) {
  const dayDate = formatDate(day.date);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
          {day.dayNumber}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Day {day.dayNumber}</h3>
          <p className="text-sm text-gray-500">{dayDate}</p>
        </div>
      </div>
      <div className="ml-5 pl-5 border-l-2 border-gray-200 space-y-3 pb-4">
        {day.items.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              No activities planned for this day
            </p>
          </div>
        ) : (
          day.items.map((item) => <PoiCard key={item._id} item={item} />)
        )}
      </div>
    </div>
  );
}

function CollaboratorsList({
  collaborators,
}: {
  collaborators: Collaborator[];
}) {
  if (collaborators.length === 0) {
    return null;
  }

  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-800',
    editor: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    accepted: 'Active',
    rejected: 'Rejected',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-emerald-600" />
        Collaborators ({collaborators.length})
      </h3>
      <div className="space-y-3">
        {collaborators.map((collab) => (
          <div
            key={collab._id}
            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
                {collab.userId.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {collab.userId}
                </p>
                <p className="text-xs text-gray-500">
                  {statusLabels[collab.status]}
                </p>
              </div>
            </div>
            <span
              className={cn(
                'px-2 py-1 rounded-full text-xs font-medium capitalize',
                roleColors[collab.role] || 'bg-gray-100 text-gray-800'
              )}
            >
              {collab.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ItineraryDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const itinerary = useQuery(api.itineraries.getById, {
    id: id as any,
  }) as Itinerary | null | undefined;

  const isLoading = itinerary === undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="space-y-4">
        <Link
          href="/itineraries"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Itineraries
        </Link>
        <div className="bg-red-50 text-red-700 p-6 rounded-lg text-center">
          <p className="font-medium">Itinerary not found</p>
          <p className="text-sm mt-1">
            The itinerary you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Button */}
      <Link
        href="/itineraries"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Itineraries
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {itinerary.coverImageUrl && (
          <div className="h-48 bg-gray-100">
            <img
              src={itinerary.coverImageUrl}
              alt={itinerary.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {itinerary.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                {itinerary.cityName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {itinerary.cityName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDateRange(itinerary.startDate, itinerary.endDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {itinerary.daysCount}{' '}
                  {itinerary.daysCount === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
            <VisibilityBadge visibility={itinerary.visibility} />
          </div>
        </div>
      </div>

      {/* Collaborators */}
      {itinerary.collaborators && itinerary.collaborators.length > 0 && (
        <CollaboratorsList collaborators={itinerary.collaborators} />
      )}

      {/* Days and POIs */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-600" />
          Itinerary
        </h2>
        <div className="space-y-6">
          {itinerary.days.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No days found for this itinerary</p>
            </div>
          ) : (
            itinerary.days.map((day) => <DaySection key={day._id} day={day} />)
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href={`/itineraries/${itinerary._id}/edit`}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
        >
          Edit Itinerary
        </Link>
        <button
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          onClick={() => {
            // TODO: Implement delete functionality with proper modal
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
