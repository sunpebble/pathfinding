import type { Itinerary } from '@pathfinding/types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { CommunityItineraryCard } from '@/components/community';
import { CopyDatePicker } from '@/components/itinerary';
import { useAuth } from '@/providers/AuthProvider';
import { itineraryService } from '@/services/itineraryService';

type CommunityItinerary = Itinerary & {
  authorName?: string;
  copyCount?: number;
};

/**
 * CommunityScreen - browse and copy public itineraries
 */
export const CommunityScreen: React.FC = () => {
  const router = useRouter();
  const { userId } = useAuth();

  const [itineraries, setItineraries] = useState<CommunityItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Copy modal state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedItinerary, setSelectedItinerary] =
    useState<CommunityItinerary | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  /**
   * Load public itineraries
   */
  const loadItineraries = useCallback(
    async (reset = false) => {
      try {
        const currentPage = reset ? 1 : page;
        const { data, meta } = await itineraryService.listPublic({
          page: currentPage,
          pageSize: 20,
          sortBy: 'popular',
        });

        if (reset) {
          setItineraries(data);
          setPage(1);
        } else {
          setItineraries((prev) => [...prev, ...data]);
        }

        setHasMore(meta.page < meta.totalPages);
      } catch {
        console.error('Failed to load community itineraries');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page]
  );

  // Initial load
  useEffect(() => {
    loadItineraries(true);
  }, [loadItineraries]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadItineraries(true);
  }, [loadItineraries]);

  /**
   * Handle load more
   */
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
      loadItineraries(false);
    }
  }, [isLoading, hasMore, loadItineraries]);

  /**
   * Handle itinerary press - view details
   */
  const handleItineraryPress = useCallback(
    (itinerary: CommunityItinerary) => {
      router.push({
        pathname: '/(tabs)/itinerary/[id]',
        params: { id: itinerary.id },
      });
    },
    [router]
  );

  /**
   * Handle copy button press - show date picker
   */
  const handleCopyPress = useCallback((itinerary: CommunityItinerary) => {
    setSelectedItinerary(itinerary);
    setShowCopyModal(true);
  }, []);

  /**
   * Handle copy confirmation
   */
  const handleCopyConfirm = useCallback(
    async (startDate: string) => {
      if (!selectedItinerary || !userId) return;

      setIsCopying(true);
      try {
        const newItinerary = await itineraryService.copy(
          selectedItinerary.id as Id<'itineraries'>,
          userId as Id<'users'>,
          startDate
        );
        setShowCopyModal(false);
        setSelectedItinerary(null);

        Alert.alert('复制成功', '行程已添加到您的行程列表', [
          {
            text: '查看',
            onPress: () =>
              router.push({
                pathname: '/(tabs)/itinerary/[id]',
                params: { id: String(newItinerary) },
              }),
          },
          { text: '继续浏览', style: 'cancel' },
        ]);
      } catch (err) {
        Alert.alert('复制失败', (err as Error).message);
      } finally {
        setIsCopying(false);
      }
    },
    [selectedItinerary, userId, router]
  );

  /**
   * Render itinerary card
   */
  const renderItem = useCallback(
    ({ item }: { item: CommunityItinerary }) => (
      <CommunityItineraryCard
        itinerary={item}
        onPress={() => handleItineraryPress(item)}
        onCopy={() => handleCopyPress(item)}
      />
    ),
    [handleItineraryPress, handleCopyPress]
  );

  /**
   * Render empty state
   */
  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyTitle}>暂无公开行程</Text>
        <Text style={styles.emptySubtitle}>
          还没有用户分享行程，你可以创建并分享你的攻略
        </Text>
      </View>
    );
  };

  /**
   * Render footer (loading indicator)
   */
  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#1976d2" />
      </View>
    );
  };

  // Calculate days for selected itinerary
  const selectedDays = selectedItinerary
    ? Math.ceil(
        (new Date(selectedItinerary.endDate).getTime() -
          new Date(selectedItinerary.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 1;

  if (isLoading && itineraries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>发现行程</Text>
        <Text style={styles.headerSubtitle}>浏览其他旅行者分享的精彩攻略</Text>
      </View>

      {/* Itinerary list */}
      <FlatList
        data={itineraries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1976d2']}
            tintColor="#1976d2"
          />
        }
      />

      {/* Copy date picker modal */}
      <CopyDatePicker
        visible={showCopyModal}
        onClose={() => {
          setShowCopyModal(false);
          setSelectedItinerary(null);
        }}
        onConfirm={handleCopyConfirm}
        originalDays={selectedDays}
      />

      {/* Copying overlay */}
      {isCopying && (
        <View style={styles.copyingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.copyingText}>正在复制行程...</Text>
        </View>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    paddingHorizontal: 32,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  copyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
