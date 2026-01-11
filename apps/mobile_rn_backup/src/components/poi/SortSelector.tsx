import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export type SortOption = 'rating' | 'distance' | 'popularity';

interface SortSelectorProps {
  selectedSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  showDistance?: boolean;
}

/**
 * Sort option labels
 */
const SORT_LABELS: Record<SortOption, string> = {
  rating: '评分最高',
  distance: '距离最近',
  popularity: '最受欢迎',
};

/**
 * Sort option icons
 */
const SORT_ICONS: Record<SortOption, string> = {
  rating: '⭐',
  distance: '📍',
  popularity: '🔥',
};

/**
 * SortSelector - toggle buttons for sorting options
 */
export const SortSelector: React.FC<SortSelectorProps> = ({
  selectedSort,
  onSortChange,
  showDistance = true,
}) => {
  const handleSortPress = useCallback(
    (sort: SortOption) => {
      onSortChange(sort);
    },
    [onSortChange]
  );

  // Build sort options, conditionally include distance
  const sortOptions: SortOption[] = showDistance
    ? ['rating', 'distance', 'popularity']
    : ['rating', 'popularity'];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>排序</Text>
      <View style={styles.buttons}>
        {sortOptions.map((option) => {
          const isSelected = selectedSort === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.button, isSelected && styles.buttonSelected]}
              onPress={() => handleSortPress(option)}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonIcon}>{SORT_ICONS[option]}</Text>
              <Text
                style={[
                  styles.buttonLabel,
                  isSelected && styles.buttonLabelSelected,
                ]}
              >
                {SORT_LABELS[option]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    gap: 4,
  },
  buttonSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  buttonIcon: {
    fontSize: 12,
  },
  buttonLabel: {
    fontSize: 12,
    color: '#666',
  },
  buttonLabelSelected: {
    color: '#1976d2',
    fontWeight: '600',
  },
});
