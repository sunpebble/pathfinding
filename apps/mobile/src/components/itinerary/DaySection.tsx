import type { ItineraryDay, ItineraryItem } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@pathfinding/utils';
import React, { useCallback } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SwipeableItemCard } from './SwipeableItemCard';

interface DaySectionProps {
  day: ItineraryDay;
  dayIndex: number;
  items: ItineraryItem[];
  onAddItem?: () => void;
  onItemPress?: (item: ItineraryItem) => void;
  onItemDelete?: (item: ItineraryItem) => void;
  onItemsReorder?: (itemIds: string[]) => void;
  isEditing?: boolean;
  isLastDay?: boolean;
}

/**
 * Day section component for timeline view with swipe-to-delete support
 */
export function DaySection({
  day,
  dayIndex: _dayIndex,
  items,
  onAddItem,
  onItemPress,
  onItemDelete,
  onItemsReorder: _onItemsReorder,
  isEditing = false,
  isLastDay = false,
}: DaySectionProps) {
  const dayDate = new Date(day.date);
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  // Handle delete with confirmation
  const handleDeleteItem = useCallback(
    (item: ItineraryItem) => {
      const poiName = (item.poi as { name?: string })?.name || '此项目';
      Alert.alert(
        '确认删除',
        `确定要删除 "${poiName}" 吗？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: () => onItemDelete?.(item),
          },
        ],
        { cancelable: true }
      );
    },
    [onItemDelete]
  );

  // Handle edit (opens modal via parent)
  const handleEditItem = useCallback(
    (item: ItineraryItem) => {
      onItemPress?.(item);
    },
    [onItemPress]
  );

  return (
    <View style={styles.container}>
      {/* Day header */}
      <View style={styles.header}>
        <View style={styles.dayIndicator}>
          <Text style={styles.dayNumber}>Day {day.dayNumber}</Text>
        </View>
        <View style={styles.dateInfo}>
          <Text style={styles.date}>{formatDate(dayDate)}</Text>
          <Text style={styles.weekDay}>{weekDays[dayDate.getDay()]}</Text>
        </View>
      </View>

      {/* Timeline line */}
      <View style={styles.timelineContainer}>
        <View style={[styles.timelineLine, isLastDay && styles.lastDayLine]} />

        {/* Items */}
        <View style={styles.itemsContainer}>
          {items.length === 0 ? (
            <View style={styles.emptyDay}>
              <Text style={styles.emptyText}>暂无安排</Text>
              {onAddItem && (
                <TouchableOpacity style={styles.addButton} onPress={onAddItem}>
                  <Ionicons name="add" size={20} color="#007AFF" />
                  <Text style={styles.addButtonText}>添加景点</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {items.map((item) => (
                <SwipeableItemCard
                  key={item.id}
                  onDelete={() => handleDeleteItem(item)}
                  onEdit={() => handleEditItem(item)}
                  disabled={!isEditing}
                >
                  <TouchableOpacity
                    style={styles.itemCard}
                    onPress={() => onItemPress?.(item)}
                    disabled={!onItemPress}
                  >
                    <View style={styles.itemDot} />
                    <View style={styles.itemContent}>
                      <View style={styles.itemHeader}>
                        {item.startTime && (
                          <Text style={styles.itemTime}>
                            {item.startTime}
                            {item.endTime && ` - ${item.endTime}`}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {(item.poi as { name: string })?.name || '未命名景点'}
                      </Text>
                      {item.notes && (
                        <Text style={styles.itemNotes} numberOfLines={2}>
                          {item.notes}
                        </Text>
                      )}
                    </View>
                    {isEditing && (
                      <Ionicons name="reorder-three" size={24} color="#CCC" />
                    )}
                  </TouchableOpacity>
                </SwipeableItemCard>
              ))}

              {/* Add more button */}
              {onAddItem && (
                <TouchableOpacity
                  style={styles.addMoreButton}
                  onPress={onAddItem}
                >
                  <View style={styles.addMoreDot} />
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color="#007AFF"
                  />
                  <Text style={styles.addMoreText}>添加更多</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayIndicator: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dayNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dateInfo: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  weekDay: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  timelineContainer: {
    flexDirection: 'row',
    paddingLeft: 24,
  },
  timelineLine: {
    width: 2,
    backgroundColor: '#E0E0E0',
    marginRight: 16,
  },
  lastDayLine: {
    backgroundColor: 'transparent',
  },
  itemsContainer: {
    flex: 1,
    paddingBottom: 24,
  },
  emptyDay: {
    paddingVertical: 16,
    alignItems: 'flex-start',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F0F7FF',
    borderRadius: 20,
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  itemNotes: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  addMoreDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  addMoreText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#007AFF',
  },
});
