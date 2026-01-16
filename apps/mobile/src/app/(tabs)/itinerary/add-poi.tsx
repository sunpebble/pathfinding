import type { Poi, PoiCategory } from '@pathfinding/types';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CategoryFilter, POICard } from '@/components/poi';
import { poiService } from '@/services/poiService';
import { useItineraryStore } from '@/store/itineraryStore';

type TabMode = 'search' | 'recommend';

/**
 * Add POI to itinerary screen - with search and recommendations
 */
export default function AddPoiScreen() {
  const { dayId, itineraryId } = useLocalSearchParams<{
    dayId: string;
    itineraryId: string;
  }>();

  const { currentItinerary } = useItineraryStore();
  const cityId = currentItinerary?.cityId;

  const [activeTab, setActiveTab] = useState<TabMode>('recommend');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PoiCategory | 'all'>(
    'all'
  );
  const [pois, setPois] = useState<Poi[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load recommendations on mount
  useEffect(() => {
    if (!cityId) return;

    const loadRecommendations = async () => {
      setIsLoading(true);
      try {
        const result = await poiService.getRecommendations(cityId);
        // Filter by category if needed
        let poiList = result.data;
        if (selectedCategory !== 'all') {
          poiList = poiList.filter((p) => p.category === selectedCategory);
        }
        setPois(poiList as Poi[]);
      } catch {
        console.error('Failed to load recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    if (activeTab === 'recommend') {
      loadRecommendations();
    }
  }, [cityId, activeTab, selectedCategory]);

  // Search POIs
  const handleSearch = useCallback(async () => {
    if (!cityId || !searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const category =
        selectedCategory === 'all' ? undefined : selectedCategory;
      const result = await poiService.search(
        cityId as Id<'cities'>,
        searchQuery.trim(),
        category,
        30
      );
      setPois(result as Poi[]);
    } catch {
      console.error('Failed to search POIs');
    } finally {
      setIsLoading(false);
    }
  }, [cityId, searchQuery, selectedCategory]);

  const handleSelectPoi = useCallback(
    (poi: Poi) => {
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
    },
    [itineraryId, dayId]
  );

  const renderPoiItem = useCallback(
    ({ item }: { item: Poi }) => (
      <POICard
        poi={item}
        onPress={() => handleSelectPoi(item)}
        onAddPress={() => handleSelectPoi(item)}
        showAddButton
      />
    ),
    [handleSelectPoi]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={activeTab === 'search' ? 'search-outline' : 'star-outline'}
        size={48}
        color="#CCC"
      />
      <Text style={styles.emptyText}>
        {activeTab === 'search'
          ? searchQuery
            ? '未找到匹配的地点'
            : '输入关键词搜索'
          : '暂无推荐'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recommend' && styles.tabActive]}
          onPress={() => setActiveTab('recommend')}
        >
          <Ionicons
            name="star"
            size={18}
            color={activeTab === 'recommend' ? '#007AFF' : '#999'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'recommend' && styles.tabTextActive,
            ]}
          >
            推荐
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.tabActive]}
          onPress={() => setActiveTab('search')}
        >
          <Ionicons
            name="search"
            size={18}
            color={activeTab === 'search' ? '#007AFF' : '#999'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'search' && styles.tabTextActive,
            ]}
          >
            搜索
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search input (only in search tab) */}
      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索景点、餐厅、购物..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Category filter */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* POI list */}
      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={pois}
          keyExtractor={(item) => item.id}
          renderItem={renderPoiItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 15,
    color: '#999',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 0,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
});
