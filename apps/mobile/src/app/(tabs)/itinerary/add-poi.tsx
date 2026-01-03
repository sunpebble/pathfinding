import type { Poi } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Sample POIs for development (will be replaced with API call)
const SAMPLE_POIS: Poi[] = [
  {
    id: '1',
    cityId: '1',
    name: '故宫博物院',
    category: 'attraction',
    latitude: 39.9169,
    longitude: 116.3907,
    address: '北京市东城区景山前街4号',
    rating: 4.8,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    cityId: '1',
    name: '天安门广场',
    category: 'attraction',
    latitude: 39.9054,
    longitude: 116.3976,
    address: '北京市东城区长安街',
    rating: 4.7,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    cityId: '1',
    name: '南锣鼓巷',
    category: 'shopping',
    latitude: 39.9375,
    longitude: 116.4034,
    address: '北京市东城区南锣鼓巷',
    rating: 4.3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Add POI to itinerary screen
 */
export default function AddPoiScreen() {
  const { dayId: _dayId, itineraryId: _itineraryId } = useLocalSearchParams<{
    dayId: string;
    itineraryId: string;
  }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [_isLoading, _setIsLoading] = useState(false);

  const filteredPois = SAMPLE_POIS.filter((poi) =>
    poi.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPoi = useCallback((_poi: Poi) => {
    // TODO: Add POI to itinerary day via API
    // Implementation: Call itineraryService.addPoiToDay(poi.id, dayId)
    router.back();
  }, []);

  const renderPoiItem = useCallback(
    ({ item }: { item: Poi }) => (
      <TouchableOpacity
        style={styles.poiItem}
        onPress={() => handleSelectPoi(item)}
      >
        <View style={styles.poiIcon}>
          <Ionicons
            name={
              item.category === 'attraction'
                ? 'camera'
                : item.category === 'restaurant'
                  ? 'restaurant'
                  : item.category === 'shopping'
                    ? 'bag'
                    : 'location'
            }
            size={24}
            color="#007AFF"
          />
        </View>
        <View style={styles.poiInfo}>
          <Text style={styles.poiName}>{item.name}</Text>
          <Text style={styles.poiAddress} numberOfLines={1}>
            {item.address}
          </Text>
          {item.rating && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFB800" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
        </View>
        <Ionicons name="add-circle" size={24} color="#007AFF" />
      </TouchableOpacity>
    ),
    [handleSelectPoi]
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索景点、餐厅、购物..."
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

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={filteredPois}
          keyExtractor={(item) => item.id}
          renderItem={renderPoiItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>未找到匹配的地点</Text>
            </View>
          }
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
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
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  poiItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
  },
  poiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  poiName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  poiAddress: {
    marginTop: 2,
    fontSize: 13,
    color: '#999',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
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
