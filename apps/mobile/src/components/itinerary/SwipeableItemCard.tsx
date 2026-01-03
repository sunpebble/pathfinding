import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  GestureHandlerRootView,
  Swipeable,
} from 'react-native-gesture-handler';

interface SwipeableItemCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onEdit: () => void;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 80;

/**
 * SwipeableItemCard - wrapper that enables swipe actions (delete, edit)
 */
export const SwipeableItemCard: React.FC<SwipeableItemCardProps> = ({
  children,
  onDelete,
  onEdit,
  disabled = false,
}) => {
  const swipeableRef = useRef<Swipeable>(null);

  // Render right actions (delete)
  const renderRightActions = useCallback(
    (
      progress: Animated.AnimatedInterpolation<number>,
      dragX: Animated.AnimatedInterpolation<number>
    ) => {
      const translateX = dragX.interpolate({
        inputRange: [-SWIPE_THRESHOLD, 0],
        outputRange: [0, SWIPE_THRESHOLD],
        extrapolate: 'clamp',
      });

      const opacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          style={[
            styles.rightActionContainer,
            { transform: [{ translateX }], opacity },
          ]}
        >
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => {
              swipeableRef.current?.close();
              onDelete();
            }}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
            <Text style={styles.actionText}>删除</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [onDelete]
  );

  // Render left actions (edit)
  const renderLeftActions = useCallback(
    (
      progress: Animated.AnimatedInterpolation<number>,
      dragX: Animated.AnimatedInterpolation<number>
    ) => {
      const translateX = dragX.interpolate({
        inputRange: [0, SWIPE_THRESHOLD],
        outputRange: [-SWIPE_THRESHOLD, 0],
        extrapolate: 'clamp',
      });

      const opacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          style={[
            styles.leftActionContainer,
            { transform: [{ translateX }], opacity },
          ]}
        >
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => {
              swipeableRef.current?.close();
              onEdit();
            }}
          >
            <Ionicons name="create-outline" size={22} color="#fff" />
            <Text style={styles.actionText}>编辑</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [onEdit]
  );

  // Handle full swipe to delete
  const handleSwipeableOpen = useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'right') {
        // Full swipe right = delete
        onDelete();
      }
    },
    [onDelete]
  );

  if (disabled) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <GestureHandlerRootView>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        friction={2}
        rightThreshold={SWIPE_THRESHOLD}
        leftThreshold={SWIPE_THRESHOLD}
        onSwipeableOpen={handleSwipeableOpen}
        overshootLeft={false}
        overshootRight={false}
      >
        <View style={styles.container}>{children}</View>
      </Swipeable>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  rightActionContainer: {
    width: SWIPE_THRESHOLD,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  leftActionContainer: {
    width: SWIPE_THRESHOLD,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  actionButton: {
    width: SWIPE_THRESHOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#e53935',
  },
  editButton: {
    backgroundColor: '#1976d2',
  },
  actionText: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
  },
});
