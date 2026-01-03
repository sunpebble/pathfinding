import type { ItineraryItem } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, getDaysBetween } from '@pathfinding/utils';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TimelineView } from '@/components/itinerary';
import { useItineraryStore } from '@/store/itineraryStore';

/**
 * Screen for displaying itinerary details
 */
export function ItineraryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isEditing, setIsEditing] = useState(false);

  const {
    currentItinerary,
    isLoading,
    fetchItineraryById,
    deleteItinerary,
    clearCurrentItinerary,
  } = useItineraryStore();

  useEffect(() => {
    if (id) {
      fetchItineraryById(id);
    }
    return () => {
      clearCurrentItinerary();
    };
  }, [id, fetchItineraryById, clearCurrentItinerary]);

  const handleAddItem = useCallback(
    (dayId: string) => {
      // Navigate to POI selection screen
      router.push({
        pathname: '/(tabs)/itinerary/add-poi',
        params: { dayId, itineraryId: id },
      });
    },
    [id]
  );

  const handleItemPress = useCallback(
    (item: ItineraryItem) => {
      // Navigate to item detail/edit screen
      router.push({
        pathname: '/(tabs)/itinerary/item/[itemId]',
        params: { itemId: item.id, itineraryId: id },
      });
    },
    [id]
  );

  const handleDelete = useCallback(() => {
    Alert.alert('删除行程', '确定要删除这个行程吗？此操作不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            await deleteItinerary(id);
            router.back();
          }
        },
      },
    ]);
  }, [id, deleteItinerary]);

  const handleEdit = useCallback(() => {
    router.push({
      pathname: '/(tabs)/itinerary/edit',
      params: { id },
    });
  }, [id]);

  if (isLoading && !currentItinerary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!currentItinerary) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#CCC" />
        <Text style={styles.errorText}>行程不存在或已被删除</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startDate = new Date(currentItinerary.startDate);
  const endDate = new Date(currentItinerary.endDate);
  const totalDays = getDaysBetween(startDate, endDate);

  return (
    <View style={styles.container}>
      {/* Header info */}
      <View style={styles.header}>
        <Text style={styles.title}>{currentItinerary.title}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {currentItinerary.cityName || '未知城市'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {formatDate(startDate)} - {formatDate(endDate)} ({totalDays}天)
          </Text>
        </View>

        {currentItinerary.description && (
          <Text style={styles.description}>{currentItinerary.description}</Text>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, isEditing && styles.activeButton]}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Ionicons
              name={isEditing ? 'checkmark' : 'pencil-outline'}
              size={18}
              color={isEditing ? '#fff' : '#007AFF'}
            />
            <Text style={[styles.actionText, isEditing && styles.activeText]}>
              {isEditing ? '完成' : '编辑'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
            <Ionicons name="settings-outline" size={18} color="#007AFF" />
            <Text style={styles.actionText}>设置</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            <Text style={[styles.actionText, styles.deleteText]}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Timeline */}
      <TimelineView
        days={currentItinerary.days || []}
        onAddItem={handleAddItem}
        onItemPress={handleItemPress}
        isEditing={isEditing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  activeText: {
    color: '#fff',
  },
  deleteText: {
    color: '#FF3B30',
  },
});

export default ItineraryDetailScreen;
