'use client';

import { api } from '@pathfinding/convex';
import { useMutation, useQuery } from 'convex/react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { toConvexId } from '@/types/convex';

interface PoiOption {
  id: string;
  name: string;
  category: string;
  address?: string;
  rating?: number;
  latitude: number;
  longitude: number;
}

interface Item {
  _id: string;
  poiId: string;
  orderIndex: number;
  startTime?: string;
  endTime?: string;
  transportMode?: string;
  notes?: string;
  poi: PoiOption | null;
}

interface Day {
  _id: string;
  dayNumber: number;
  date: string;
  items?: Item[];
}

interface ItineraryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  itineraryId: string;
  days: Day[];
  userId: string;
}

const transportModeOptions = [
  { value: 'walking', label: 'Walking', emoji: '🚶' },
  { value: 'driving', label: 'Driving', emoji: '🚗' },
  { value: 'transit', label: 'Transit', emoji: '🚇' },
  { value: 'cycling', label: 'Cycling', emoji: '🚴' },
  { value: 'taxi', label: 'Taxi', emoji: '🚕' },
];

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function ItemEditor({
  item,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isSaving,
}: {
  item: Item;
  onUpdate: (updates: Partial<Item>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isSaving: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localStartTime, setLocalStartTime] = useState(item.startTime || '');
  const [localEndTime, setLocalEndTime] = useState(item.endTime || '');
  const [localNotes, setLocalNotes] = useState(item.notes || '');
  const [localTransportMode, setLocalTransportMode] = useState(
    item.transportMode || 'walking'
  );

  const poi = item.poi;

  if (!poi) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-sm text-red-700">POI not found</p>
      </div>
    );
  }

  const handleSaveChanges = () => {
    onUpdate({
      startTime: localStartTime || undefined,
      endTime: localEndTime || undefined,
      notes: localNotes || undefined,
      transportMode: localTransportMode,
    });
    setIsExpanded(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{poi.name}</h4>
          <p className="text-xs text-gray-500 capitalize">{poi.category}</p>
        </div>
        <div className="flex items-center gap-1">
          {canMoveUp && (
            <button
              onClick={onMoveUp}
              disabled={isSaving}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              aria-label="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          )}
          {canMoveDown && (
            <button
              onClick={onMoveDown}
              disabled={isSaving}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              aria-label="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </button>
          <button
            onClick={onRemove}
            disabled={isSaving}
            className="p-1 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
            aria-label="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Start Time
              </label>
              <input
                type="time"
                value={localStartTime}
                onChange={(e) => setLocalStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                End Time
              </label>
              <input
                type="time"
                value={localEndTime}
                onChange={(e) => setLocalEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Transport Mode */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Transport Mode
            </label>
            <select
              value={localTransportMode}
              onChange={(e) => setLocalTransportMode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {transportModeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.emoji} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Notes
            </label>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Add notes about this activity..."
            />
          </div>

          {/* POI Details */}
          <div className="pt-2 border-t border-gray-200">
            {poi.address && (
              <p className="text-xs text-gray-600 flex items-start gap-1 mb-1">
                <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{poi.address}</span>
              </p>
            )}
            {poi.rating && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span className="text-amber-500">★</span>
                <span>{poi.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className={cn(
                'px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium transition-all',
                'hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-2'
              )}
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DayEditor({
  day,
  items,
  userId,
  cityId,
  onItemsChange,
}: {
  day: Day;
  items: Item[];
  userId: string;
  cityId?: string;
  onItemsChange: () => void;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const createItem = useMutation(api.itineraryItems.create);
  const updateItem = useMutation(api.itineraryItems.update);
  const removeItem = useMutation(api.itineraryItems.remove);
  const reorderItem = useMutation(api.itineraryItems.reorder);

  // Search POIs
  const poisQuery = useQuery(
    api.pois.search,
    cityId && isSearching
      ? {
          query: searchQuery || '',
          cityId: toConvexId<'cities'>(cityId),
          category: selectedCategory as
            | 'attraction'
            | 'restaurant'
            | 'hotel'
            | 'shopping'
            | 'other'
            | undefined,
          limit: 20,
        }
      : 'skip'
  );

  const pois = (poisQuery || []).map((poi) => ({
    id: poi._id,
    name: poi.name,
    category: poi.category,
    address: poi.address,
    rating: poi.rating,
    latitude: poi.latitude,
    longitude: poi.longitude,
  }));

  const handleAddPoi = async (poiId: string) => {
    setIsSaving(true);
    setError('');
    try {
      await createItem({
        dayId: toConvexId<'itineraryDays'>(day._id),
        userId,
        poiId: toConvexId<'pois'>(poiId),
      });
      setIsSearching(false);
      setSearchQuery('');
      onItemsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add POI');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async (itemId: string, updates: Partial<Item>) => {
    setIsSaving(true);
    setError('');
    try {
      await updateItem({
        id: toConvexId<'itineraryItems'>(itemId),
        userId,
        startTime: updates.startTime,
        endTime: updates.endTime,
        notes: updates.notes,
        transportMode: updates.transportMode as
          | 'walking'
          | 'driving'
          | 'transit'
          | 'cycling'
          | 'taxi'
          | undefined,
      });
      onItemsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setIsSaving(true);
    setError('');
    try {
      await removeItem({
        id: toConvexId<'itineraryItems'>(itemId),
        userId,
      });
      onItemsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveUp = async (item: Item) => {
    if (item.orderIndex === 0) return;

    setIsSaving(true);
    setError('');
    try {
      await reorderItem({
        itemId: toConvexId<'itineraryItems'>(item._id),
        userId,
        newOrderIndex: item.orderIndex - 1,
      });
      onItemsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveDown = async (item: Item) => {
    if (item.orderIndex >= items.length - 1) return;

    setIsSaving(true);
    setError('');
    try {
      await reorderItem({
        itemId: toConvexId<'itineraryItems'>(item._id),
        userId,
        newOrderIndex: item.orderIndex + 1,
      });
      onItemsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder item');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Day Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
          {day.dayNumber}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Day {day.dayNumber}</h3>
          <p className="text-xs text-gray-500">{formatDate(day.date)}</p>
        </div>
        <button
          onClick={() => setIsSearching(!isSearching)}
          disabled={isSaving}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
            isSearching
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-emerald-600 text-white hover:bg-emerald-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSearching ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add POI
            </>
          )}
        </button>
      </div>

      {/* POI Search */}
      {isSearching && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search POIs..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Categories</option>
              <option value="attraction">Attraction</option>
              <option value="restaurant">Restaurant</option>
              <option value="hotel">Hotel</option>
              <option value="shopping">Shopping</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Results */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {pois.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                {cityId ? 'No POIs found' : 'City not specified for itinerary'}
              </p>
            ) : (
              pois.map((poi: PoiOption) => (
                <button
                  key={poi.id}
                  onClick={() => handleAddPoi(poi.id)}
                  disabled={isSaving}
                  className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {poi.name}
                      </h4>
                      <p className="text-xs text-gray-500 capitalize">
                        {poi.category}
                      </p>
                      {poi.address && (
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {poi.address}
                        </p>
                      )}
                    </div>
                    {poi.rating && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-amber-500">★</span>
                        <span className="font-medium">
                          {poi.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">
              No activities planned for this day
            </p>
          </div>
        ) : (
          items.map((item, index) => (
            <ItemEditor
              key={item._id}
              item={item}
              onUpdate={(updates) => handleUpdateItem(item._id, updates)}
              onRemove={() => handleRemoveItem(item._id)}
              onMoveUp={() => handleMoveUp(item)}
              onMoveDown={() => handleMoveDown(item)}
              canMoveUp={index > 0}
              canMoveDown={index < items.length - 1}
              isSaving={isSaving}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function ItineraryEditor({
  isOpen,
  onClose,
  itineraryId,
  days,
  userId,
}: ItineraryEditorProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch itinerary to get cityId
  const itinerary = useQuery(api.itineraries.getById, {
    id: toConvexId<'itineraries'>(itineraryId),
  });

  const handleItemsChange = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (!isOpen) return null;

  const cityId = itinerary?.cityId;
  const enrichedDays = itinerary?.days || days;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Itinerary</h2>
            <p className="text-sm text-gray-500 mt-1">
              Add, edit, and organize activities for each day
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {enrichedDays.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No days in this itinerary</p>
            </div>
          ) : (
            enrichedDays.map((day: Day) => (
              <DayEditor
                key={`${day._id}-${refreshKey}`}
                day={day}
                items={day.items || []}
                userId={userId}
                cityId={cityId}
                onItemsChange={handleItemsChange}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
