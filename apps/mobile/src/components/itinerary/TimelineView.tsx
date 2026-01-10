import type {
  ItineraryDay,
  ItineraryItem,
  TransportMode,
} from '@pathfinding/types';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { itineraryService } from '@/services/itineraryService';
import { UndoSnackbar } from '../common/UndoSnackbar';
import { DaySection } from './DaySection';
import { EditItemModal } from './EditItemModal';

interface TimelineViewProps {
  days: (ItineraryDay & { items?: ItineraryItem[] })[];
  itineraryId: string;
  onAddItem?: (dayId: string) => void;
  onItemPress?: (item: ItineraryItem) => void;
  onItemUpdate?: (
    dayId: string,
    itemId: string,
    updates: Partial<ItineraryItem>
  ) => Promise<void>;
  onItemDelete?: (dayId: string, itemId: string) => Promise<void>;
  onItemsReorder?: (dayId: string, itemIds: string[]) => Promise<void>;
  isEditing?: boolean;
}

/**
 * Timeline view component showing all days and items with editing support
 * Optimized for 10+ items using memoization and ScrollView windowing
 */
export function TimelineView({
  days,
  onAddItem,
  onItemPress,
  onItemUpdate,
  onItemDelete,
  onItemsReorder,
  isEditing = false,
}: TimelineViewProps) {
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  // Undo snackbar state
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoMessage, setUndoMessage] = useState('');
  const [undoAction, setUndoAction] = useState<(() => Promise<void>) | null>(
    null
  );

  // Handle item tap - open edit modal
  const handleItemPress = useCallback(
    (item: ItineraryItem, dayId: string) => {
      if (isEditing) {
        setSelectedItem(item);
        setSelectedDayId(dayId);
        setEditModalVisible(true);
      } else {
        onItemPress?.(item);
      }
    },
    [isEditing, onItemPress]
  );

  // Handle save from edit modal
  const handleSaveItem = useCallback(
    async (updates: {
      startTime?: string | null;
      endTime?: string | null;
      notes?: string;
      transportMode?: TransportMode;
      transportMinutes?: number | null;
    }): Promise<{
      conflicts?: Array<{
        itemId: string;
        startTime: string;
        endTime: string;
        poiName?: string;
      }>;
    }> => {
      if (!selectedItem || !selectedDayId || !onItemUpdate) return {};

      // Convert null to undefined for the update call
      const cleanUpdates: Partial<ItineraryItem> = {};
      if (updates.startTime !== undefined) {
        cleanUpdates.startTime = updates.startTime ?? undefined;
      }
      if (updates.endTime !== undefined) {
        cleanUpdates.endTime = updates.endTime ?? undefined;
      }
      if (updates.notes !== undefined) {
        cleanUpdates.notes = updates.notes;
      }
      if (updates.transportMode !== undefined) {
        cleanUpdates.transportMode = updates.transportMode;
      }
      if (updates.transportMinutes !== undefined) {
        cleanUpdates.transportMinutes = updates.transportMinutes ?? undefined;
      }

      await onItemUpdate(selectedDayId, selectedItem.id, cleanUpdates);
      setEditModalVisible(false);
      setSelectedItem(null);
      setSelectedDayId(null);
      return {};
    },
    [selectedItem, selectedDayId, onItemUpdate]
  );

  // Handle delete from edit modal or swipe
  const handleDeleteItem = useCallback(
    async (dayId: string, item: ItineraryItem) => {
      if (!onItemDelete) return;

      // Store for undo
      const deletedItem = { ...item };
      const deletedDayId = dayId;

      await onItemDelete(dayId, item.id);
      setEditModalVisible(false);
      setSelectedItem(null);
      setSelectedDayId(null);

      // Show undo snackbar
      const poiName = (item.poi as { name?: string })?.name || '项目';
      setUndoMessage(`已删除 "${poiName}"`);
      setUndoAction(() => async () => {
        // Re-add the item via API
        try {
          const poiId =
            typeof deletedItem.poi === 'object' && deletedItem.poi
              ? (deletedItem.poi as { id?: string }).id
              : undefined;

          await itineraryService.addItem(itineraryId, deletedDayId, {
            poiId,
            startTime: deletedItem.startTime ?? undefined,
            endTime: deletedItem.endTime ?? undefined,
            notes: deletedItem.notes,
            transportMode: deletedItem.transportMode,
            transportMinutes: deletedItem.transportMinutes ?? undefined,
          });
        } catch (error) {
          console.error('Failed to restore deleted item:', error);
        }
      });
      setUndoVisible(true);
    },
    [onItemDelete, itineraryId]
  );

  // Handle reorder
  const handleReorder = useCallback(
    async (dayId: string, itemIds: string[]) => {
      if (!onItemsReorder) return;
      await onItemsReorder(dayId, itemIds);
    },
    [onItemsReorder]
  );

  // Memoize day sections for better performance
  const memoizedDays = useMemo(() => {
    return days.map((day, index) => (
      <DaySection
        key={day.id}
        day={day}
        dayIndex={index}
        items={day.items || []}
        onAddItem={onAddItem ? () => onAddItem(day.id) : undefined}
        onItemPress={(item) => handleItemPress(item, day.id)}
        onItemDelete={
          isEditing ? (item) => handleDeleteItem(day.id, item) : undefined
        }
        onItemsReorder={
          isEditing ? (itemIds) => handleReorder(day.id, itemIds) : undefined
        }
        isEditing={isEditing}
        isLastDay={index === days.length - 1}
      />
    ));
  }, [
    days,
    onAddItem,
    isEditing,
    handleItemPress,
    handleDeleteItem,
    handleReorder,
  ]);

  // Dismiss undo snackbar
  const handleUndoDismiss = useCallback(() => {
    setUndoVisible(false);
    setUndoAction(null);
  }, []);

  // Execute undo action
  const handleUndo = useCallback(async () => {
    if (undoAction) {
      await undoAction();
    }
    setUndoVisible(false);
    setUndoAction(null);
  }, [undoAction]);

  if (days.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>暂无行程安排</Text>
        <Text style={styles.emptySubtitle}>创建行程后会自动生成日期框架</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
      >
        {memoizedDays}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Edit Item Modal */}
      <EditItemModal
        visible={editModalVisible}
        item={selectedItem}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedItem(null);
          setSelectedDayId(null);
        }}
        onSave={handleSaveItem}
        onDelete={
          selectedItem && selectedDayId
            ? () => handleDeleteItem(selectedDayId, selectedItem)
            : undefined
        }
      />

      {/* Undo Snackbar */}
      <UndoSnackbar
        visible={undoVisible}
        message={undoMessage}
        onUndo={handleUndo}
        onDismiss={handleUndoDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
});
