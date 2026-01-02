import type { ItineraryWithStats } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ItineraryCard } from '../../components/itinerary';
import { useItineraryStore } from '../../store/itineraryStore';

/**
 * Screen for listing user's itineraries
 */
export function ItineraryListScreen() {
  const {
    itineraries,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchItineraries,
    fetchMoreItineraries,
    refreshItineraries,
  } = useItineraryStore();

  useEffect(() => {
    fetchItineraries();
  }, [fetchItineraries]);

  const handleRefresh = useCallback(() => {
    refreshItineraries();
  }, [refreshItineraries]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      fetchMoreItineraries();
    }
  }, [hasMore, isLoadingMore, fetchMoreItineraries]);

  const handleItineraryPress = useCallback((itinerary: ItineraryWithStats) => {
    router.push(`/(tabs)/itinerary/${itinerary.id}`);
  }, []);

  const handleCreatePress = useCallback(() => {
    router.push('/(tabs)/itinerary/create');
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ItineraryWithStats }) => (
      <ItineraryCard
        itinerary={item}
        onPress={() => handleItineraryPress(item)}
      />
    ),
    [handleItineraryPress]
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="map-outline" size={80} color="#CCC" />
        <Text style={styles.emptyTitle}>还没有行程</Text>
        <Text style={styles.emptySubtitle}>创建你的第一个旅行攻略吧</Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={handleCreatePress}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>创建行程</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading, handleCreatePress]);

  if (isLoading && itineraries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={itineraries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && itineraries.length > 0}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />

      {itineraries.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleCreatePress}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
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
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#999',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 24,
  },
  emptyButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default ItineraryListScreen;
