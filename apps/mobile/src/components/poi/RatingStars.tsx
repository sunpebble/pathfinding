import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: number;
  color?: string;
  emptyColor?: string;
}

/**
 * Star rating display component
 * Displays filled, half-filled, and empty stars based on rating value
 */
export function RatingStars({
  rating,
  maxRating = 5,
  size = 16,
  color = '#FFB800',
  emptyColor = '#E0E0E0',
}: RatingStarsProps) {
  const stars = [];
  const floorRating = Math.floor(rating);
  const hasHalfStar = rating - floorRating >= 0.5;

  for (let i = 0; i < maxRating; i++) {
    if (i < floorRating) {
      // Full star
      stars.push(<Ionicons key={i} name="star" size={size} color={color} />);
    } else if (i === floorRating && hasHalfStar) {
      // Half star
      stars.push(
        <Ionicons key={i} name="star-half" size={size} color={color} />
      );
    } else {
      // Empty star
      stars.push(
        <Ionicons key={i} name="star-outline" size={size} color={emptyColor} />
      );
    }
  }

  return <View style={styles.container}>{stars}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
