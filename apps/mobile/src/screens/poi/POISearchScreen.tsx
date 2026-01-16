import type { Poi, PoiCategory } from '@pathfinding/types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { POI_CATEGORIES, POI_CATEGORY_VALUES } from '@pathfinding/constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { POICard } from '@/components/poi/POICard';
import { poiService } from '@/services/poiService';

/**
 * POI Search Screen for finding and selecting POIs to add to itinerary
 */
export default function POISearchScreen() {
  const router = useRouter();
  const { cityId, itineraryId, dayId } = useLocalSearchParams<{
    cityId: string;
    itineraryId: string;
    dayId: string;
  }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    PoiCategory | undefined
  >();
  const [pois, setPois] = useState<Poi[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const searchPois = useCallback(
    async (_reset = false) => {
      if (!cityId) return;

      setIsLoading(true);
      try {
        const result = await poiService.search(
          cityId as Id<'cities'>,
          searchQuery || '',
          selectedCategory,
          50
        );

        // The search returns an array directly
        const poiList = result as Poi[];
        setPois(poiList);
        setHasMore(false); // Simple search doesn't have pagination
      } catch {
        // Handle error silently for now
      } finally {
        setIsLoading(false);
      }
    },
    [cityId, searchQuery, selectedCategory]
  );

  // Search on mount and when filters change
  useEffect(() => {
    searchPois(true);
  }, [searchQuery, selectedCategory, cityId, searchPois]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      searchPois(false);
    }
  }, [isLoading, hasMore, searchPois]);

  const handleSelectPoi = useCallback(
    (poi: Poi) => {
      // Navigate to add item screen with selected POI
      router.push({
        pathname: '/(tabs)/itinerary/add-item',
        params: {
          itineraryId,
          dayId,
          poiId: poi.id,
          poiName: poi.name,
        },
      });
    },
    [router, itineraryId, dayId]
  );

  const handleAddPoi = useCallback(
    (poi: Poi) => {
      handleSelectPoi(poi);
    },
    [handleSelectPoi]
  );

  const renderCategoryFilter = () => (
    <View style={styles.categoryContainer}>
      <TouchableOpacity
        style={[
          styles.categoryChip,
          !selectedCategory && styles.categoryChipActive,
        ]}
        onPress={() => setSelectedCategory(undefined)}
      >
        <Text
          style={[
            styles.categoryChipText,
            !selectedCategory && styles.categoryChipTextActive,
          ]}
        >
          全部
        </Text>
      </TouchableOpacity>
      {POI_CATEGORY_VALUES.map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryChip,
            selectedCategory === category && styles.categoryChipActive,
          ]}
          onPress={() => setSelectedCategory(category)}
        >
          <Text
            style={[
              styles.categoryChipText,
              selectedCategory === category && styles.categoryChipTextActive,
            ]}
          >
            {POI_CATEGORIES[category].label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color="#ccc" />
      <Text style={styles.emptyStateText}>
        {searchQuery ? '未找到相关景点' : '搜索景点、餐厅等'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索景点、餐厅..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderCategoryFilter()}

      <FlatList
        data={pois}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <POICard
            poi={item}
            onPress={handleSelectPoi}
            onAddPress={handleAddPoi}
            showAddButton
          />
        )}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={styles.loader} color="#007AFF" />
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  categoryChipActive: {
    backgroundColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
  },
  loader: {
    paddingVertical: 20,
  },
});
