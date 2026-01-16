import type { ItineraryItem, TransportMode } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { TRANSPORT_MODES } from '@pathfinding/constants';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RatingStars } from '../poi/RatingStars';

interface ItineraryItemCardProps {
  item: ItineraryItem;
  onPress?: (item: ItineraryItem) => void;
  onDelete?: (item: ItineraryItem) => void;
  showTransport?: boolean;
  isFirst?: boolean;
}

/**
 * Itinerary item card for displaying a single activity in the timeline
 */
export function ItineraryItemCard({
  item,
  onPress,
  onDelete,
  showTransport = true,
  isFirst = false,
}: ItineraryItemCardProps) {
  const poi = item.poi;
  const transportInfo = item.transportMode
    ? TRANSPORT_MODES[item.transportMode as TransportMode]
    : undefined;

  return (
    <View style={styles.wrapper}>
      {/* Transport indicator (shown between items) */}
      {showTransport && !isFirst && (
        <View style={styles.transportContainer}>
          <View style={styles.transportLine} />
          <View style={styles.transportBadge}>
            <Ionicons
              name={
                (transportInfo?.icon as keyof typeof Ionicons.glyphMap) ||
                'walk'
              }
              size={14}
              color="#666"
            />
            {item.transportMinutes && (
              <Text style={styles.transportText}>
                {item.transportMinutes}分钟
              </Text>
            )}
          </View>
          <View style={styles.transportLine} />
        </View>
      )}

      <TouchableOpacity
        style={styles.container}
        onPress={() => onPress?.(item)}
        activeOpacity={0.7}
      >
        {/* Time indicator */}
        <View style={styles.timeColumn}>
          {item.startTime && (
            <Text style={styles.startTime}>{item.startTime}</Text>
          )}
          {item.endTime && <Text style={styles.endTime}>{item.endTime}</Text>}
          {!item.startTime && !item.endTime && (
            <Text style={styles.noTime}>--:--</Text>
          )}
        </View>

        {/* Timeline dot and line */}
        <View style={styles.timelineColumn}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineLine} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {poi ? (
            <>
              <View style={styles.header}>
                {poi.imageUrls?.[0] && (
                  <Image
                    source={{ uri: poi.imageUrls[0] }}
                    style={styles.image}
                  />
                )}
                <View style={styles.headerText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {poi.name}
                  </Text>
                  {poi.rating && (
                    <View style={styles.ratingRow}>
                      <RatingStars rating={poi.rating} size={12} />
                      <Text style={styles.ratingText}>
                        {poi.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {poi.address && (
                <Text style={styles.address} numberOfLines={1}>
                  {poi.address}
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.customActivity}>自定义活动</Text>
          )}

          {item.notes && (
            <Text style={styles.notes} numberOfLines={2}>
              {item.notes}
            </Text>
          )}
        </View>

        {/* Delete button */}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(item)}
          >
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  transportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 56,
    paddingRight: 16,
    marginVertical: 4,
  },
  transportLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  transportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  transportText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  timeColumn: {
    width: 44,
    alignItems: 'center',
  },
  startTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  endTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  noTime: {
    fontSize: 14,
    color: '#ccc',
  },
  timelineColumn: {
    width: 20,
    alignItems: 'center',
    marginRight: 8,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#e0e0e0',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#FFB800',
    marginLeft: 4,
  },
  address: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  customActivity: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  notes: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
});
