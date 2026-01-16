import type { Poi } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { POI_CATEGORIES } from '@pathfinding/constants';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RatingStars } from './RatingStars';

interface POICardProps {
  poi: Poi;
  onPress?: (poi: Poi) => void;
  onAddPress?: (poi: Poi) => void;
  showAddButton?: boolean;
  compact?: boolean;
}

/**
 * POI card component for displaying point of interest information
 * Supports both full and compact modes
 */
export function POICard({
  poi,
  onPress,
  onAddPress,
  showAddButton = false,
  compact = false,
}: POICardProps) {
  const categoryInfo = POI_CATEGORIES[
    poi.category as keyof typeof POI_CATEGORIES
  ] || {
    label: poi.category,
    icon: 'location',
  };

  const priceText = poi.priceLevel ? '¥'.repeat(poi.priceLevel) : null;

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={() => onPress?.(poi)}
        activeOpacity={0.7}
      >
        {poi.imageUrls?.[0] && (
          <Image
            source={{ uri: poi.imageUrls[0] }}
            style={styles.compactImage}
          />
        )}
        <View style={styles.compactContent}>
          <Text style={styles.compactName} numberOfLines={1}>
            {poi.name}
          </Text>
          {poi.rating && (
            <View style={styles.ratingRow}>
              <RatingStars rating={poi.rating} size={12} />
              <Text style={styles.ratingText}>{poi.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        {showAddButton && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onAddPress?.(poi)}
          >
            <Ionicons name="add-circle" size={28} color="#007AFF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(poi)}
      activeOpacity={0.7}
    >
      {poi.imageUrls?.[0] && (
        <Image source={{ uri: poi.imageUrls[0] }} style={styles.image} />
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={2}>
            {poi.name}
          </Text>
          <View style={styles.categoryBadge}>
            <Ionicons
              name={categoryInfo.icon as keyof typeof Ionicons.glyphMap}
              size={12}
              color="#666"
            />
            <Text style={styles.categoryText}>{categoryInfo.label}</Text>
          </View>
        </View>

        <View style={styles.ratingContainer}>
          {poi.rating ? (
            <>
              <RatingStars rating={poi.rating} size={14} />
              <Text style={styles.ratingValue}>{poi.rating.toFixed(1)}</Text>
            </>
          ) : (
            <Text style={styles.noRating}>暂无评分</Text>
          )}
          {priceText && <Text style={styles.priceLevel}>{priceText}</Text>}
        </View>

        {poi.address && (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color="#999" />
            <Text style={styles.address} numberOfLines={1}>
              {poi.address}
            </Text>
          </View>
        )}
      </View>

      {showAddButton && (
        <TouchableOpacity
          style={styles.addButtonLarge}
          onPress={() => onAddPress?.(poi)}
        >
          <Ionicons name="add-circle" size={32} color="#007AFF" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  compactImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  compactContent: {
    flex: 1,
    marginLeft: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  compactName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFB800',
    marginLeft: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#FFB800',
    marginLeft: 4,
  },
  noRating: {
    fontSize: 12,
    color: '#999',
  },
  priceLevel: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  address: {
    flex: 1,
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  addButton: {
    padding: 4,
  },
  addButtonLarge: {
    alignSelf: 'center',
    padding: 4,
  },
});
