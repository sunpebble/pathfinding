'use client';

import type { ItineraryDay, ItineraryDetail, ItineraryItem } from '@/lib/api/itineraries';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit3,
  Eye,
  Globe,
  Lock,
  MapPin,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CollaboratorPanel } from '@/components/collaborator-panel';
import { InviteDialog } from '@/components/invite-dialog';
import { ItineraryEditor } from '@/components/itinerary-editor';
import { ItineraryMap } from '@/components/itinerary-map';
import { PdfExportButton } from '@/components/pdf-export-button';
import { getCollaborators } from '@/lib/api/collaborators';
import {
  getItinerary,

  normalizeCollaboratorsResponse,
  normalizeItineraryResponse,
} from '@/lib/api/itineraries';
import { cn } from '@/lib/utils';
import { useAuthContext as useAuth } from '@/providers/auth-provider';

function VisibilityBadge({ visibility }: { visibility: string }) {
  const icons = {
    private: Lock,
    friends: Users,
    public: Globe,
  };
  const colors: Record<string, string> = {
    private: 'bg-gray-100 text-gray-800 border-gray-200',
    friends: 'bg-blue-100 text-blue-800 border-blue-200',
    public: 'bg-green-100 text-green-800 border-green-200',
  };
  const labels: Record<string, string> = {
    private: 'Private',
    friends: 'Friends',
    public: 'Public',
  };

  const Icon = icons[visibility as keyof typeof icons] || Lock;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border',
        colors[visibility] || 'bg-gray-100 text-gray-800 border-gray-200',
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
  }
  catch {
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

function PoiCard({ item }: { item: ItineraryItem }) {
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
              Transport:
              {' '}
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

function DaySection({ day }: { day: ItineraryDay }) {
  const dayDate = formatDate(day.date);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
          {day.dayNumber}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">
            Day
            {day.dayNumber}
          </h3>
          <p className="text-sm text-gray-500">{dayDate}</p>
        </div>
      </div>
      <div className="ml-5 pl-5 border-l-2 border-gray-200 space-y-3 pb-4">
        {day.items.length === 0
          ? (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                <p className="text-sm text-gray-500">
                  No activities planned for this day
                </p>
              </div>
            )
          : (
              day.items.map(item => <PoiCard key={item.id} item={item} />)
            )}
      </div>
    </div>
  );
}

export default function ItineraryDetailPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/signin');
    }
  }, [authLoading, isAuthenticated, router]);

  const itineraryResult = useQuery({
    queryKey: ['itinerary', id],
    enabled: Boolean(isAuthenticated && id),
    queryFn: () => getItinerary(id),
  });

  const collaboratorsResult = useQuery({
    queryKey: ['itinerary-collaborators', id],
    enabled: Boolean(isAuthenticated && id),
    queryFn: () => getCollaborators(id),
  });

  const normalizedItinerary = itineraryResult.data
    ? normalizeItineraryResponse(itineraryResult.data).data
    : null;
  const collaborators = collaboratorsResult.data
    ? normalizeCollaboratorsResponse(collaboratorsResult.data).data
    : [];
  const itinerary: ItineraryDetail | null = normalizedItinerary
    ? {
        ...normalizedItinerary,
        collaborators,
      }
    : null;
  const currentUserId = user?.id;

  const isLoading
    = authLoading
      || (isAuthenticated && (itineraryResult.isLoading || collaboratorsResult.isLoading));

  const inferredOwnerFallback = Boolean(
    currentUserId
    && itinerary?.userId
    && itinerary.userId === currentUserId,
  );

  // Determine current user's role
  const currentUserCollaborator = currentUserId
    ? itinerary?.collaborators?.find(c => c.userId === currentUserId)
    : undefined;
  const isOwner = currentUserCollaborator?.role === 'owner' || inferredOwnerFallback;
  const isEditor
    = currentUserCollaborator?.role === 'editor'
      || currentUserCollaborator?.role === 'owner'
      || inferredOwnerFallback;

  if (!authLoading && !isAuthenticated) {
    return null;
  }

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

  const editorDays = itinerary.days.map(day => ({
    _id: day.id,
    dayNumber: day.dayNumber,
    date: day.date,
    items: day.items.map(item => ({
      _id: item.id,
      poiId: item.poiId,
      orderIndex: item.orderIndex,
      startTime: item.startTime,
      endTime: item.endTime,
      transportMode: item.transportMode,
      notes: item.notes,
      poi: item.poi
        ? {
            id: item.poi.id,
            name: item.poi.name,
            category: item.poi.category || 'other',
            address: item.poi.address,
            rating: item.poi.rating,
            latitude: item.poi.latitude ?? 0,
            longitude: item.poi.longitude ?? 0,
          }
        : null,
    })),
  }));

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
                  {itinerary.daysCount}
                  {' '}
                  {itinerary.daysCount === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PdfExportButton itineraryId={id} />
              <VisibilityBadge visibility={itinerary.visibility} />
            </div>
          </div>
        </div>
      </div>

      {/* Collaborators */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                Collaborators
              </h3>
              <p className="text-sm text-gray-600">
                {itinerary.collaborators.length}
                {' '}
                {itinerary.collaborators.length === 1 ? 'person has' : 'people have'}
                {' '}
                access to this itinerary.
              </p>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsInviteDialogOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <UserPlus className="h-4 w-4" />
                Invite Collaborator
              </button>
            )}
          </div>
          <CollaboratorPanel
            key={itinerary.collaborators.map(collaborator => `${collaborator.id}:${collaborator.role}:${collaborator.status}`).join('|')}
            itineraryId={id}
            collaborators={itinerary.collaborators.map(collaborator => ({
              id: collaborator.id,
              userId: collaborator.userId,
              role: collaborator.role,
              status: collaborator.status,
            }))}
            currentUserId={currentUserId ?? ''}
            isOwner={Boolean(isOwner)}
          />
        </div>
      </div>

      {/* Interactive Map */}
      {itinerary.days.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-emerald-600" />
            地图概览
          </h2>
          <ItineraryMap
            days={itinerary.days}
            className="h-[400px] rounded-xl border border-gray-200"
          />
        </div>
      )}

      {/* Days and POIs */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            Itinerary
          </h2>
          {isEditor && (
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Edit3 className="h-4 w-4" />
              Edit Itinerary
            </button>
          )}
        </div>
        <div className="space-y-6">
          {itinerary.days.length === 0
            ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No days found for this itinerary</p>
                </div>
              )
            : (
                itinerary.days.map(day => <DaySection key={day.id} day={day} />)
              )}
        </div>
      </div>

      {(isOwner && currentUserId) && (
        <InviteDialog
          isOpen={isInviteDialogOpen}
          onClose={() => setIsInviteDialogOpen(false)}
          itineraryId={id}
          currentUserId={currentUserId}
        />
      )}

      {(isEditor && currentUserId) && (
        <ItineraryEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          itineraryId={id}
          days={editorDays}
          userId={currentUserId}
        />
      )}
    </div>
  );
}
