import type { Poi, PoiCategory } from '@pathfinding/types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import type { SortOption } from '@/components/poi';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { CategoryFilter, POICard, SortSelector } from '@/components/poi';
import { useLocation } from '@/hooks/useLocation';
import { poiService } from '@/services/poiService';

/**
 * POIRecommendScreen - shows POI recommendations with category filter and sorting
 */
export const POIRecommendScreen: React.FC = () => {
  const params = useLocalSearchParams<{
    cityId: string;
    cityName?: string;
    itineraryId?: string;
    dayId?: string;
  }>();
  const router = useRouter();
  const { cityId, cityName, itineraryId, dayId } = params;

  const { location, getCurrentLocation, permissionStatus } = useLocation();

  // State
  const [pois, setPois] = useState<Poi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PoiCategory | 'all'>(
    'all'
  );
  const [sortOption, setSortOption] = useState<SortOption>('rating');

  /**
   * Load recommendations
   */
  const loadRecommendations = useCallback(async () => {
    if (!cityId) return;

    try {
      if (sortOption === 'distance' && location) {
        // Use nearby endpoint for distance sorting
        const data = await poiService.getNearby({
          cityId: cityId as Id<'cities'>,
          latitude: location.latitude,
          longitude: location.longitude,
          radiusKm: 10,
          limit: 50,
        });
        // Filter by category if needed
        let filtered = data;
        if (selectedCategory !== 'all') {
          filtered = data.filter((p) => p.category === selectedCategory);
        }
        setPois(filtered as Poi[]);
      } else {
        // Use recommendations endpoint for rating/popularity sorting
        const result = await poiService.getRecommendations(cityId);
        let poiList = result.data;

        // Filter by category if needed
        if (selectedCategory !== 'all') {
          poiList = poiList.filter((p) => p.category === selectedCategory);
        }

        // Sort by rating (default behavior from API)
        setPois(poiList as Poi[]);
      }
    } catch {
      console.error('Failed to load recommendations');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [cityId, selectedCategory, sortOption, location]);

  // Load on mount and when filters change
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  /**
   * Handle distance sort - request location permission
   */
  const handleSortChange = useCallback(
    async (sort: SortOption) => {
      if (sort === 'distance' && !location) {
        const coords = await getCurrentLocation();
        if (!coords) {
          // Permission denied or error, don't change sort
          return;
        }
      }
      setSortOption(sort);
    },
    [location, getCurrentLocation]
  );

  /**
   * Handle category change
   */
  const handleCategoryChange = useCallback((category: PoiCategory | 'all') => {
    setSelectedCategory(category);
  }, []);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadRecommendations();
  }, [loadRecommendations]);

  /**
   * Handle POI selection - navigate to add item
   */
  const handleSelectPoi = useCallback(
    (poi: Poi) => {
      if (itineraryId && dayId) {
        router.push({
          pathname: '/(tabs)/itinerary/add-item',
          params: {
            itineraryId,
            dayId,
            poiId: poi.id,
            poiName: poi.name,
            poiCategory: poi.category,
          },
        });
      }
    },
    [router, itineraryId, dayId]
  );

  /**
   * Render POI card
   */
  const renderItem = useCallback(
    ({ item }: { item: Poi }) => (
      <POICard
        poi={item}
        onPress={() => handleSelectPoi(item)}
        onAddPress={() => handleSelectPoi(item)}
        showAddButton={!!itineraryId && !!dayId}
      />
    ),
    [handleSelectPoi, itineraryId, dayId]
  );

  /**
   * Render list empty state
   */
  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyTitle}>暂无推荐</Text>
        <Text style={styles.emptySubtitle}>当前分类下没有找到推荐的地点</Text>
      </View>
    );
  };

  /**
   * Render loading state
   */
  if (isLoading && pois.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>加载推荐中...</Text>
      </View>
    );
  }

  // Show distance option only if location permission is granted or undetermined
  const showDistanceSort =
    permissionStatus !== 'denied' && permissionStatus !== null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {cityName ? `${cityName} 推荐` : '推荐景点'}
        </Text>
        <Text style={styles.headerSubtitle}>为您精选评分最高的地点</Text>
      </View>

      {/* Category Filter */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* Sort Selector */}
      <SortSelector
        selectedSort={sortOption}
        onSortChange={handleSortChange}
        showDistance={showDistanceSort}
      />

      {/* POI List */}
      <FlatList
        data={pois}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1976d2']}
            tintColor="#1976d2"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
