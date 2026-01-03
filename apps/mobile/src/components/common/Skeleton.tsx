import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

/**
 * Skeleton - animated loading placeholder
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.skeleton, { width, height, borderRadius, opacity }, style]}
    />
  );
};

/**
 * ItineraryCardSkeleton - loading placeholder for itinerary card
 */
export const ItineraryCardSkeleton: React.FC = () => {
  return (
    <View style={styles.card}>
      <Skeleton height={160} borderRadius={12} />
      <View style={styles.cardContent}>
        <Skeleton width="60%" height={20} style={styles.mb8} />
        <Skeleton width="40%" height={14} style={styles.mb8} />
        <View style={styles.row}>
          <Skeleton width={80} height={14} />
          <Skeleton width={60} height={14} />
        </View>
      </View>
    </View>
  );
};

/**
 * DaySectionSkeleton - loading placeholder for day section
 */
export const DaySectionSkeleton: React.FC = () => {
  return (
    <View style={styles.daySection}>
      <View style={styles.dayHeader}>
        <Skeleton width={60} height={28} borderRadius={14} />
        <Skeleton width={100} height={16} style={styles.ml12} />
      </View>
      <View style={styles.items}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.itemSkeleton}>
            <Skeleton width={8} height={8} borderRadius={4} />
            <View style={styles.itemContent}>
              <Skeleton width="30%" height={12} style={styles.mb4} />
              <Skeleton width="80%" height={16} style={styles.mb4} />
              <Skeleton width="50%" height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * POICardSkeleton - loading placeholder for POI card
 */
export const POICardSkeleton: React.FC = () => {
  return (
    <View style={styles.poiCard}>
      <Skeleton width={100} height={100} borderRadius={8} />
      <View style={styles.poiContent}>
        <Skeleton width="70%" height={18} style={styles.mb8} />
        <Skeleton width="90%" height={14} style={styles.mb8} />
        <View style={styles.row}>
          <Skeleton width={60} height={14} />
          <Skeleton width={40} height={14} />
        </View>
      </View>
    </View>
  );
};

/**
 * ListSkeleton - multiple skeleton items for list loading
 */
export const ListSkeleton: React.FC<{
  count?: number;
  ItemComponent?: React.FC;
}> = ({ count = 3, ItemComponent = ItineraryCardSkeleton }) => {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <ItemComponent key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mb4: {
    marginBottom: 4,
  },
  mb8: {
    marginBottom: 8,
  },
  ml12: {
    marginLeft: 12,
  },
  daySection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  items: {
    paddingLeft: 24,
  },
  itemSkeleton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  itemContent: {
    flex: 1,
  },
  poiCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  poiContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
});
