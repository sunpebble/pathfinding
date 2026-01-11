import type { Itinerary } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@pathfinding/utils';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

interface CommunityItineraryCardProps {
  itinerary: Itinerary & { authorName?: string; copyCount?: number };
  onPress: () => void;
  onCopy?: () => void;
}

/**
 * CommunityItineraryCard - displays a public itinerary in the community feed
 */
export const CommunityItineraryCard: React.FC<CommunityItineraryCardProps> = ({
  itinerary,
  onPress,
  onCopy,
}) => {
  const startDate = new Date(itinerary.startDate);
  const endDate = new Date(itinerary.endDate);
  const daysCount =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Cover image or placeholder */}
      <View style={styles.coverContainer}>
        {itinerary.coverImageUrl ? (
          <View style={styles.cover}>
            {/* Image would go here */}
            <View style={styles.coverPlaceholder}>
              <Ionicons name="image-outline" size={32} color="#999" />
            </View>
          </View>
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Ionicons name="map-outline" size={32} color="#999" />
          </View>
        )}
        {/* Days badge */}
        <View style={styles.daysBadge}>
          <Text style={styles.daysBadgeText}>{daysCount}天</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {itinerary.title}
        </Text>

        {/* City and date info */}
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.infoText}>
            {itinerary.cityName || '未知城市'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#666" />
          <Text style={styles.infoText}>
            {formatDate(startDate)} - {formatDate(endDate)}
          </Text>
        </View>

        {/* Author and stats */}
        <View style={styles.footer}>
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(itinerary.authorName || '匿').charAt(0)}
              </Text>
            </View>
            <Text style={styles.authorName} numberOfLines={1}>
              {itinerary.authorName || '匿名用户'}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="copy-outline" size={14} color="#999" />
              <Text style={styles.statText}>{itinerary.copyCount || 0}</Text>
            </View>
          </View>
        </View>

        {/* Copy button */}
        {onCopy && (
          <TouchableOpacity
            style={styles.copyButton}
            onPress={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.copyButtonText}>复制到我的行程</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    height: 140,
    width: '100%',
  },
  coverPlaceholder: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  daysBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
  },
  authorName: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#999',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
