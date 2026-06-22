'use client';

import type { ItineraryDay as ApiDay, ItineraryItem as ApiItem } from '@/lib/api/itineraries';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useCallback, useMemo, useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  createItineraryItem,
  getItinerary,
  normalizeItineraryResponse,
  removeItineraryItem,
  reorderItineraryItems,
  updateItineraryItem,
} from '@/lib/api/itineraries';
import { searchPois } from '@/lib/api/pois';
import { cn } from '@/lib/utils';

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
  id: string;
  poiId: string;
  orderIndex: number;
  startTime?: string;
  endTime?: string;
  transportMode?: string;
  notes?: string;
  poi: PoiOption | null;
}

interface Day {
  id: string;
  dayNumber: number;
  date: string;
  items: Item[];
}

interface LegacyItem {
  _id: string;
  poiId: string;
  orderIndex: number;
  startTime?: string;
  endTime?: string;
  transportMode?: string;
  notes?: string;
  poi: PoiOption | null;
}

interface LegacyDay {
  _id: string;
  dayNumber: number;
  date: string;
  items?: LegacyItem[];
}

interface ItineraryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  itineraryId: string;
  days: LegacyDay[];
}

const transportModeOptions = [
  { value: 'walking', label: '步行', emoji: '🚶' },
  { value: 'driving', label: '驾车', emoji: '🚗' },
  { value: 'transit', label: '公共交通', emoji: '🚇' },
  { value: 'cycling', label: '骑行', emoji: '🚴' },
  { value: 'taxi', label: '出租车', emoji: '🚕' },
];

function formatDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  catch {
    return dateString;
  }
}

function normalizeItem(item: Item | LegacyItem): Item {
  return {
    id: 'id' in item ? item.id : item._id,
    poiId: item.poiId,
    orderIndex: item.orderIndex,
    startTime: item.startTime,
    endTime: item.endTime,
    transportMode: item.transportMode,
    notes: item.notes,
    poi: item.poi,
  };
}

function normalizeApiItem(item: ApiItem): Item {
  return {
    id: item.id,
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
  };
}

function normalizeApiDay(day: ApiDay): Day {
  return {
    id: day.id,
    dayNumber: day.dayNumber,
    date: day.date,
    items: day.items.map(normalizeApiItem),
  };
}

function normalizeDay(day: Day | LegacyDay): Day {
  return {
    id: 'id' in day ? day.id : day._id,
    dayNumber: day.dayNumber,
    date: day.date,
    items: (day.items ?? []).map(normalizeItem),
  };
}

function reorderItemIds(items: Item[], itemId: string, newOrderIndex: number) {
  const orderedItems = [...items].sort((left, right) => left.orderIndex - right.orderIndex);
  const currentIndex = orderedItems.findIndex(item => item.id === itemId);

  if (currentIndex === -1) {
    return orderedItems.map(item => item.id);
  }

  const [movedItem] = orderedItems.splice(currentIndex, 1);
  orderedItems.splice(newOrderIndex, 0, movedItem!);

  return orderedItems.map(item => item.id);
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
  const [localTransportMode, setLocalTransportMode] = useState(item.transportMode || 'walking');

  const poi = item.poi;

  if (!poi) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-sm text-red-700">未找到兴趣点</p>
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
      <div className="p-3 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{poi.name}</h4>
          <p className="text-xs text-gray-500 capitalize">{poi.category}</p>
        </div>
        <div className="flex items-center gap-1">
          {canMoveUp && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={isSaving}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  aria-label="上移"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>上移</TooltipContent>
            </Tooltip>
          )}
          {canMoveDown && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={isSaving}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  aria-label="下移"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>下移</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={isExpanded ? '收起' : '展开'}
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isExpanded && 'rotate-180',
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>{isExpanded ? '收起' : '展开'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onRemove}
                disabled={isSaving}
                className="p-1 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                aria-label="移除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>移除</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`start-time-${item.id}`} className="text-xs font-medium text-gray-700 mb-1 block">
                开始时间
              </label>
              <input
                id={`start-time-${item.id}`}
                type="time"
                value={localStartTime}
                onChange={e => setLocalStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label htmlFor={`end-time-${item.id}`} className="text-xs font-medium text-gray-700 mb-1 block">
                结束时间
              </label>
              <input
                id={`end-time-${item.id}`}
                type="time"
                value={localEndTime}
                onChange={e => setLocalEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor={`transport-mode-${item.id}`} className="text-xs font-medium text-gray-700 mb-1 block">
              交通方式
            </label>
            <select
              id={`transport-mode-${item.id}`}
              value={localTransportMode}
              onChange={e => setLocalTransportMode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {transportModeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.emoji}
                  {' '}
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`notes-${item.id}`} className="text-xs font-medium text-gray-700 mb-1 block">
              备注
            </label>
            <textarea
              id={`notes-${item.id}`}
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="添加关于此活动的备注..."
            />
          </div>

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

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving}
              className={cn(
                'px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium transition-all',
                'hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-2',
              )}
            >
              <Save className="h-4 w-4" />
              保存更改
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
  itineraryId,
  cityId,
  onRefresh,
}: {
  day: Day;
  items: Item[];
  itineraryId: string;
  cityId?: string;
  onRefresh: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const poisQuery = useQuery({
    queryKey: ['pois-search', cityId, searchQuery, selectedCategory, isSearching],
    enabled: Boolean(cityId && isSearching),
    queryFn: () => searchPois({
      q: searchQuery || undefined,
      cityId,
      category: selectedCategory || undefined,
      limit: 20,
    }),
  });

  const createItemMutation = useMutation({
    mutationFn: (poiId: string) => createItineraryItem(itineraryId, day.id, {
      poiId,
      orderIndex: items.length,
    }),
  });
  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: Partial<Item> }) => updateItineraryItem(itineraryId, day.id, itemId, {
      startTime: updates.startTime,
      endTime: updates.endTime,
      notes: updates.notes,
      transportMode: updates.transportMode,
    }),
  });
  const reorderItemMutation = useMutation({
    mutationFn: ({ itemId, newOrderIndex }: { itemId: string; newOrderIndex: number }) => reorderItineraryItems(
      itineraryId,
      day.id,
      reorderItemIds(items, itemId, newOrderIndex),
    ),
  });
  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => removeItineraryItem(itineraryId, day.id, itemId),
  });

  const pois = useMemo(
    () => (poisQuery.data?.data ?? []).map(poi => ({
      id: String(poi.id),
      name: poi.name,
      category: poi.category || 'other',
      address: poi.address || undefined,
      rating: undefined,
      latitude: poi.latitude ?? 0,
      longitude: poi.longitude ?? 0,
    })),
    [poisQuery.data],
  );

  const refreshEditor = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['itinerary', itineraryId] });
    await onRefresh();
  }, [itineraryId, onRefresh, queryClient]);

  const handleAddPoi = async (poiId: string) => {
    setIsSaving(true);
    setError('');
    try {
      await createItemMutation.mutateAsync(poiId);
      setIsSearching(false);
      setSearchQuery('');
      await refreshEditor();
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '添加兴趣点失败');
    }
    finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async (itemId: string, updates: Partial<Item>) => {
    setIsSaving(true);
    setError('');
    try {
      await updateItemMutation.mutateAsync({ itemId, updates });
      await refreshEditor();
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '更新项目失败');
    }
    finally {
      setIsSaving(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setIsSaving(true);
    setError('');
    try {
      await removeItemMutation.mutateAsync(itemId);
      await refreshEditor();
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '移除项目失败');
    }
    finally {
      setIsSaving(false);
    }
  };

  const handleMoveUp = async (item: Item) => {
    if (item.orderIndex === 0) {
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await reorderItemMutation.mutateAsync({ itemId: item.id, newOrderIndex: item.orderIndex - 1 });
      await refreshEditor();
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '重新排序失败');
    }
    finally {
      setIsSaving(false);
    }
  };

  const handleMoveDown = async (item: Item) => {
    if (item.orderIndex >= items.length - 1) {
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await reorderItemMutation.mutateAsync({ itemId: item.id, newOrderIndex: item.orderIndex + 1 });
      await refreshEditor();
    }
    catch (err) {
      setError(err instanceof Error ? err.message : '重新排序失败');
    }
    finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
          {day.dayNumber}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            第
            {day.dayNumber}
            天
          </h3>
          <p className="text-xs text-gray-500">{formatDate(day.date)}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsSearching(!isSearching)}
          disabled={isSaving}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
            isSearching ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-emerald-600 text-white hover:bg-emerald-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isSearching
            ? (
                <>
                  <X className="h-4 w-4" />
                  取消
                </>
              )
            : (
                <>
                  <Plus className="h-4 w-4" />
                  添加兴趣点
                </>
              )}
        </button>
      </div>

      {isSearching && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索兴趣点..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              aria-label="按分类筛选兴趣点"
            >
              <option value="">全部分类</option>
              <option value="attraction">景点</option>
              <option value="restaurant">餐厅</option>
              <option value="hotel">酒店</option>
              <option value="shopping">购物</option>
              <option value="other">其他</option>
            </select>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {pois.length === 0
              ? (
                  <p className="text-sm text-gray-500 text-center py-4">{cityId ? '未找到兴趣点' : '行程未指定城市'}</p>
                )
              : (
                  pois.map(poi => (
                    <button
                      type="button"
                      key={poi.id}
                      onClick={() => handleAddPoi(poi.id)}
                      disabled={isSaving}
                      className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">{poi.name}</h4>
                          <p className="text-xs text-gray-500 capitalize">{poi.category}</p>
                          {poi.address && <p className="text-xs text-gray-600 mt-1 truncate">{poi.address}</p>}
                        </div>
                      </div>
                    </button>
                  ))
                )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0
          ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">当天暂无计划活动</p>
              </div>
            )
          : (
              items.map((item, index) => (
                <ItemEditor
                  key={`${item.id}-${item.startTime ?? ''}-${item.endTime ?? ''}-${item.notes ?? ''}-${item.transportMode ?? ''}`}
                  item={item}
                  onUpdate={updates => handleUpdateItem(item.id, updates)}
                  onRemove={() => handleRemoveItem(item.id)}
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
}: ItineraryEditorProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const itineraryQuery = useQuery({
    queryKey: ['itinerary', itineraryId],
    enabled: Boolean(isOpen && itineraryId),
    queryFn: async () => normalizeItineraryResponse(await getItinerary(itineraryId)).data,
  });

  const editorDays = useMemo(
    () => (itineraryQuery.data?.days ? itineraryQuery.data.days.map(normalizeApiDay) : days.map(normalizeDay)),
    [days, itineraryQuery.data?.days],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshKey(prev => prev + 1);
    await itineraryQuery.refetch();
  }, [itineraryQuery]);

  if (!isOpen) {
    return null;
  }

  const cityId = itineraryQuery.data?.cityId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">编辑行程</h2>
            <p className="text-sm text-gray-500 mt-1">添加、编辑和组织每天的活动</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="关闭"
              >
                <X className="h-6 w-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent>关闭</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {editorDays.length === 0
            ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">此行程暂无天数</p>
                </div>
              )
            : (
                editorDays.map(day => (
                  <DayEditor
                    key={`${day.id}-${refreshKey}`}
                    day={day}
                    items={day.items}
                    itineraryId={itineraryId}
                    cityId={cityId}
                    onRefresh={handleRefresh}
                  />
                ))
              )}
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
