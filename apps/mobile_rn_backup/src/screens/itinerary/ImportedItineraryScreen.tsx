import type { BlogLocation } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlogMapView } from '@/components/blog';
import { useBlogStore } from '@/store/blogStore';
import { useItineraryStore } from '@/store/itineraryStore';

interface EditableLocation extends BlogLocation {
  startTime?: string;
  endTime?: string;
  category?: '景点' | '美食' | '酒店' | '其他';
  dayNumber?: number;
}

/**
 * Screen for editing an itinerary imported from a blog post
 * Redesigned to match the reference UI with day-based grouping
 */
export function ImportedItineraryScreen() {
  const { blogPostId } = useLocalSearchParams<{ blogPostId: string }>();
  const { currentBlogPost, isLoading, fetchBlogPost } = useBlogStore();
  const { createItinerary } = useItineraryStore();

  // Editable locations state
  const [locations, setLocations] = useState<EditableLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Fetch blog post on mount
  useEffect(() => {
    if (blogPostId) {
      fetchBlogPost(blogPostId);
    }
  }, [blogPostId, fetchBlogPost]);

  // Initialize editable locations from blog post

  useEffect(() => {
    if (currentBlogPost?.locations && locations.length === 0) {
      const totalLocations = currentBlogPost.locations.length;
      const locationsPerDay = Math.ceil(totalLocations / 2); // Divide into days

      const initialLocations: EditableLocation[] = currentBlogPost.locations
        .sort((a, b) => a.order - b.order)
        .map((loc, index) => ({
          ...loc,
          startTime: `${String(9 + (index % locationsPerDay) * 2).padStart(2, '0')}:00`,
          endTime: `${String(11 + (index % locationsPerDay) * 2).padStart(2, '0')}:00`,
          category: index % 2 === 0 ? '景点' : '美食',
          dayNumber: Math.floor(index / locationsPerDay) + 1,
        }));
      setLocations(initialLocations);
    }
  }, [currentBlogPost?.locations, locations.length]);

  // Group locations by day
  const locationsByDay = useMemo(() => {
    const grouped: { [day: number]: EditableLocation[] } = {};
    locations.forEach((loc) => {
      const day = loc.dayNumber || 1;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(loc);
    });
    return grouped;
  }, [locations]);

  // Map locations for BlogMapView - ensure all required fields are present
  // Use stable reference to prevent re-renders
  const mapLocations = useMemo(() => {
    if (locations.length === 0) return [];
    // Use a stable date based on first load
    const baseDate = new Date('2024-01-01');
    return locations.map((loc) => ({
      ...loc,
      blogPostId: blogPostId || '',
      createdAt: loc.createdAt || baseDate,
      updatedAt: loc.updatedAt || baseDate,
    }));
  }, [locations, blogPostId]);

  // Handle location name update with geocoding
  const handleUpdateName = useCallback(async (id: string, name: string) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, name } : loc))
    );
    // Note: In a full implementation, we would call a geocoding API here
    // to get new coordinates based on the name
  }, []);

  // Handle category update
  const handleUpdateCategory = useCallback(
    (id: string, category: '景点' | '美食' | '酒店' | '其他') => {
      setLocations((prev) =>
        prev.map((loc) => (loc.id === id ? { ...loc, category } : loc))
      );
    },
    []
  );

  // Handle move item via drag
  const handleMoveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setLocations((prev) => {
      const newLocations = [...prev];
      const [removed] = newLocations.splice(fromIndex, 1);
      newLocations.splice(toIndex, 0, removed);

      // Re-assign day numbers and order
      const locationsPerDay = Math.ceil(newLocations.length / 2);
      return newLocations.map((loc, index) => ({
        ...loc,
        order: index + 1,
        dayNumber: Math.floor(index / locationsPerDay) + 1,
      }));
    });
  }, []);

  // Handle delete location
  const handleDelete = useCallback((id: string) => {
    Alert.alert('删除地点', '确定要删除这个地点吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          setLocations((prev) => {
            const filtered = prev.filter((loc) => loc.id !== id);
            const locationsPerDay = Math.max(Math.ceil(filtered.length / 2), 1);
            return filtered.map((loc, index) => ({
              ...loc,
              order: index + 1,
              dayNumber: Math.floor(index / locationsPerDay) + 1,
            }));
          });
        },
      },
    ]);
  }, []);

  // Handle location selection for map highlight
  const handleSelectLocation = useCallback((id: string) => {
    setSelectedLocationId((prev) => (prev === id ? null : id));
  }, []);

  // Handle memo button press
  const handleMemo = useCallback(() => {
    Alert.alert('备忘录', '备忘录功能即将推出');
  }, []);

  // Handle add note for a location
  const handleAddNote = useCallback(
    (locationId: string, locationName: string) => {
      Alert.prompt(
        '添加备注',
        `为 ${locationName} 添加备注`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确定',
            onPress: (note) => {
              if (note) {
                setLocations((prev) =>
                  prev.map((loc) =>
                    loc.id === locationId ? { ...loc, description: note } : loc
                  )
                );
              }
            },
          },
        ],
        'plain-text',
        ''
      );
    },
    []
  );

  // Handle save to itinerary
  const handleSave = useCallback(async () => {
    if (!currentBlogPost || locations.length === 0) return;

    setIsSaving(true);
    try {
      // Group locations by day
      const dayGroups: { [key: number]: EditableLocation[] } = {};
      locations.forEach((loc) => {
        const day = loc.dayNumber || 1;
        if (!dayGroups[day]) dayGroups[day] = [];
        dayGroups[day].push(loc);
      });

      // Create days array for the itinerary
      const days = Object.keys(dayGroups)
        .sort((a, b) => Number(a) - Number(b))
        .map((dayKey, index) => {
          const dayLocations = dayGroups[Number(dayKey)];
          return {
            dayNumber: index + 1,
            date: new Date(Date.now() + index * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            locations: dayLocations.map((loc, locIndex) => ({
              name: loc.name,
              description: loc.description || '',
              latitude: loc.latitude,
              longitude: loc.longitude,
              order: locIndex + 1,
              category: loc.category || '景点',
            })),
          };
        });

      // Create the itinerary
      await createItinerary({
        title: currentBlogPost.title,
        description: `从博文"${currentBlogPost.title}"导入的攻略`,
        days,
      });

      Alert.alert('保存成功', `已将 ${locations.length} 个地点保存到您的攻略`, [
        {
          text: '查看攻略',
          onPress: () => router.replace('/(tabs)/itinerary'),
        },
      ]);
    } catch (error) {
      Alert.alert('保存失败', (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }, [currentBlogPost, locations, createItinerary]);

  // Calculate total days (used for display)
  const _totalDays = useMemo(() => {
    return Math.max(...locations.map((l) => l.dayNumber || 1), 1);
  }, [locations]);

  if (isLoading && !currentBlogPost) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!currentBlogPost) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#CCC" />
        <Text style={styles.errorText}>无法加载博文数据</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的攻略</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.itineraryTitle}>{currentBlogPost.title}</Text>
          <TouchableOpacity style={styles.memoButton} onPress={handleMemo}>
            <Text style={styles.memoButtonText}>备忘录</Text>
          </TouchableOpacity>
        </View>

        {/* Map with markers */}
        <View style={styles.mapContainer}>
          <BlogMapView
            locations={mapLocations}
            height={180}
            selectedLocationId={selectedLocationId}
          />
        </View>

        {/* Itinerary section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>行程</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Text style={styles.editButton}>
              {isEditing ? '完成编辑' : '编辑行程'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timeline by day */}
        <View style={styles.timeline}>
          {Object.keys(locationsByDay)
            .sort((a, b) => Number(a) - Number(b))
            .map((dayKey) => {
              const day = Number(dayKey);
              const dayLocations = locationsByDay[day];

              return (
                <View key={day} style={styles.daySection}>
                  {/* Day header */}
                  <View style={styles.dayHeader}>
                    <View style={styles.timelineDot} />
                    <Text style={styles.dayTitle}>第{day}天</Text>
                  </View>

                  {/* Day items */}
                  {dayLocations.map((location, _indexInDay) => {
                    const globalIndex = locations.findIndex(
                      (l) => l.id === location.id
                    );
                    const isSelected = selectedLocationId === location.id;
                    const isDragging = draggingId === location.id;
                    const isDropTarget =
                      draggingId && draggingId !== location.id;

                    return (
                      <TouchableOpacity
                        key={location.id}
                        style={[
                          styles.locationItem,
                          isSelected && styles.locationItemSelected,
                          isEditing && styles.locationItemEditing,
                          isDragging && styles.locationItemDragging,
                          isDropTarget && styles.locationItemDropTarget,
                        ]}
                        onPress={() => {
                          if (draggingId && draggingId !== location.id) {
                            // Drop the dragged item here
                            const fromIndex = locations.findIndex(
                              (l) => l.id === draggingId
                            );
                            handleMoveItem(fromIndex, globalIndex);
                            setDraggingId(null);
                          } else {
                            handleSelectLocation(location.id);
                          }
                        }}
                        onLongPress={() => {
                          if (isEditing) {
                            setDraggingId(location.id);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        {/* Timeline line */}
                        <View style={styles.timelineConnector}>
                          <View style={styles.timelineLine} />
                        </View>

                        {/* Content */}
                        <View style={styles.locationContent}>
                          {/* Category + Name row */}
                          <View style={styles.locationRow}>
                            <Text style={styles.categoryLabel}>
                              {location.category || '景点'}：
                            </Text>
                            {isEditing ? (
                              <TextInput
                                style={styles.nameInput}
                                value={location.name}
                                onChangeText={(text) =>
                                  handleUpdateName(location.id, text)
                                }
                                placeholder="地点名称"
                              />
                            ) : (
                              <Text style={styles.locationName}>
                                {location.name}
                              </Text>
                            )}
                            <TouchableOpacity
                              style={styles.noteButton}
                              onPress={() =>
                                handleAddNote(location.id, location.name)
                              }
                            >
                              <Text style={styles.noteButtonText}>
                                {location.description ? '修改备注' : '添加备注'}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* Edit actions */}
                          {isEditing && (
                            <View style={styles.editActions}>
                              {/* Category selector */}
                              <View style={styles.categorySelector}>
                                {(['景点', '美食'] as const).map((cat) => (
                                  <TouchableOpacity
                                    key={cat}
                                    style={[
                                      styles.categoryOption,
                                      location.category === cat &&
                                        styles.categoryOptionActive,
                                    ]}
                                    onPress={() =>
                                      handleUpdateCategory(location.id, cat)
                                    }
                                  >
                                    <Text
                                      style={[
                                        styles.categoryOptionText,
                                        location.category === cat &&
                                          styles.categoryOptionTextActive,
                                      ]}
                                    >
                                      {cat}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>

                              {/* Drag handle */}
                              <View style={styles.dragHandle}>
                                <Ionicons
                                  name="reorder-three"
                                  size={24}
                                  color="#999"
                                />
                                <Text style={styles.dragHint}>长按拖拽</Text>
                              </View>

                              {/* Delete */}
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDelete(location.id)}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={18}
                                  color="#FF3B30"
                                />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
        </View>

        {/* Tips section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsText}>
            温馨提示：点击地点可在地图上高亮显示，编辑模式下可拖拽调整顺序
          </Text>
        </View>
      </ScrollView>

      {/* Bottom action */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.startButton, isSaving && styles.startButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving || locations.length === 0}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#333" />
          ) : (
            <Text style={styles.startButtonText}>保存攻略</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backIcon: {
    padding: 8,
    width: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  itineraryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  memoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  memoButtonText: {
    fontSize: 14,
    color: '#666',
  },
  mapContainer: {
    backgroundColor: '#E5E5E5',
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    fontSize: 14,
    color: '#666',
  },
  timeline: {
    paddingHorizontal: 16,
  },
  daySection: {
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
    marginRight: 8,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  locationItem: {
    flexDirection: 'row',
    marginLeft: 3,
    paddingLeft: 12,
    paddingVertical: 6,
  },
  locationItemSelected: {
    backgroundColor: '#F0F7FF',
    marginLeft: 0,
    paddingLeft: 15,
    marginRight: -16,
    paddingRight: 16,
    borderRadius: 0,
  },
  locationItemEditing: {
    backgroundColor: '#fff',
    marginVertical: 4,
    marginHorizontal: -4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  locationItemDragging: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  locationItemDropTarget: {
    borderTopWidth: 3,
    borderTopColor: '#2196F3',
    marginTop: 2,
  },
  timelineConnector: {
    width: 16,
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 1,
  },
  locationContent: {
    flex: 1,
    paddingLeft: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  categoryLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  locationName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  nameInput: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    flex: 1,
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  noteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noteButtonText: {
    fontSize: 12,
    color: '#007AFF',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  categoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryOptionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#fff',
  },
  dragHandle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    gap: 4,
  },
  dragHint: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  tipsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tipsText: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ImportedItineraryScreen;
