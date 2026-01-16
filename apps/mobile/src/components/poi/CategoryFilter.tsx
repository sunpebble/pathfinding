import type { PoiCategory } from '@pathfinding/types';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

interface CategoryFilterProps {
  selectedCategory: PoiCategory | 'all';
  onCategoryChange: (category: PoiCategory | 'all') => void;
}

/**
 * Category labels in Chinese
 */
const CATEGORY_LABELS: Record<PoiCategory | 'all', string> = {
  all: '全部',
  attraction: '景点',
  restaurant: '餐厅',
  cafe: '咖啡',
  bar: '酒吧',
  museum: '博物馆',
  park: '公园',
  shopping: '购物',
  hotel: '酒店',
  transport: '交通',
  entertainment: '娱乐',
  other: '其他',
};

/**
 * Category icons (emoji for simplicity)
 */
const CATEGORY_ICONS: Record<PoiCategory | 'all', string> = {
  all: '🗂️',
  attraction: '🏛️',
  restaurant: '🍜',
  cafe: '☕',
  bar: '🍺',
  museum: '🏛️',
  park: '🌳',
  shopping: '🛍️',
  hotel: '🏨',
  transport: '🚇',
  entertainment: '🎭',
  other: '📍',
};

/**
 * CategoryFilter - horizontal scrollable category tabs
 */
export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
}) => {
  // Build categories array with 'all' first
  const categories: Array<PoiCategory | 'all'> = [
    'all',
    'attraction',
    'restaurant',
    'cafe',
    'bar',
    'museum',
    'park',
    'shopping',
    'hotel',
    'transport',
    'entertainment',
    'other',
  ];

  const handleCategoryPress = useCallback(
    (category: PoiCategory | 'all') => {
      onCategoryChange(category);
    },
    [onCategoryChange]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category;
          return (
            <TouchableOpacity
              key={category}
              style={[styles.tab, isSelected && styles.tabSelected]}
              onPress={() => handleCategoryPress(category)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabIcon}>{CATEGORY_ICONS[category]}</Text>
              <Text
                style={[styles.tabLabel, isSelected && styles.tabLabelSelected]}
              >
                {CATEGORY_LABELS[category]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    gap: 4,
  },
  tabSelected: {
    backgroundColor: '#1976d2',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 14,
    color: '#666',
  },
  tabLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});
