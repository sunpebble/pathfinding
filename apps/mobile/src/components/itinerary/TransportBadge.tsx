import type { TransportMode } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { TRANSPORT_MODES } from '@pathfinding/constants';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TransportBadgeProps {
  mode: TransportMode;
  minutes?: number | null;
  distance?: number | null; // in meters
  onPress?: () => void;
  showDuration?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// Icon mapping for transport modes
const TRANSPORT_ICONS: Record<TransportMode, keyof typeof Ionicons.glyphMap> = {
  walking: 'walk-outline',
  transit: 'bus-outline',
  driving: 'car-outline',
  cycling: 'bicycle-outline',
  taxi: 'car-sport-outline',
};

// Colors for transport modes
const TRANSPORT_COLORS: Record<TransportMode, string> = {
  walking: '#4CAF50',
  transit: '#2196F3',
  driving: '#FF9800',
  cycling: '#9C27B0',
  taxi: '#F44336',
};

/**
 * TransportBadge - shows transport mode with optional duration between POIs
 */
export const TransportBadge: React.FC<TransportBadgeProps> = ({
  mode,
  minutes,
  distance,
  onPress,
  showDuration = true,
  size = 'medium',
}) => {
  const transportInfo = TRANSPORT_MODES[mode];
  const iconName = TRANSPORT_ICONS[mode];
  const color = TRANSPORT_COLORS[mode];

  // Format duration
  const formatDuration = (mins: number): string => {
    if (mins < 60) {
      return `${mins} 分钟`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) {
      return `${hours} 小时`;
    }
    return `${hours} 小时 ${remainingMins} 分钟`;
  };

  // Format distance
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} 米`;
    }
    return `${(meters / 1000).toFixed(1)} 公里`;
  };

  // Size configurations
  const sizeConfig = {
    small: { icon: 14, font: 10, padding: 4 },
    medium: { icon: 16, font: 12, padding: 6 },
    large: { icon: 20, font: 14, padding: 8 },
  };

  const config = sizeConfig[size];

  const content = (
    <View style={[styles.container, { backgroundColor: `${color}15` }]}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: color, padding: config.padding },
        ]}
      >
        <Ionicons name={iconName} size={config.icon} color="#fff" />
      </View>
      <View style={styles.infoContainer}>
        <Text style={[styles.modeName, { fontSize: config.font }]}>
          {transportInfo.label}
        </Text>
        {showDuration && minutes !== null && minutes !== undefined && (
          <Text style={[styles.duration, { fontSize: config.font - 2 }]}>
            约 {formatDuration(minutes)}
          </Text>
        )}
        {distance !== null && distance !== undefined && (
          <Text style={[styles.distance, { fontSize: config.font - 2 }]}>
            {formatDistance(distance)}
          </Text>
        )}
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={config.icon} color={color} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

/**
 * Compact transport indicator for timeline view
 */
export const TransportIndicator: React.FC<{
  mode: TransportMode;
  minutes?: number | null;
  onPress?: () => void;
}> = ({ mode, minutes, onPress }) => {
  const iconName = TRANSPORT_ICONS[mode];
  const color = TRANSPORT_COLORS[mode];

  const content = (
    <View style={styles.indicatorContainer}>
      <View style={styles.indicatorLine} />
      <View style={[styles.indicatorBadge, { borderColor: color }]}>
        <Ionicons name={iconName} size={12} color={color} />
        {minutes !== null && minutes !== undefined && (
          <Text style={[styles.indicatorText, { color }]}>{minutes}分</Text>
        )}
      </View>
      <View style={styles.indicatorLine} />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingRight: 12,
    overflow: 'hidden',
  },
  iconContainer: {
    borderRadius: 8,
    marginRight: 8,
  },
  infoContainer: {
    flex: 1,
  },
  modeName: {
    fontWeight: '600',
    color: '#333',
  },
  duration: {
    color: '#666',
    marginTop: 2,
  },
  distance: {
    color: '#999',
  },
  // Indicator styles
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  indicatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  indicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 8,
    gap: 4,
  },
  indicatorText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
