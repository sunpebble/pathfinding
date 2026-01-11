import type { ViewStyle } from 'react-native';
import type { PanGesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface DraggableItemProps {
  id: string;
  index: number;
  itemHeight: number;
  isDragging: boolean;
  isBeingDragged: boolean;
  onDragStart: (id: string, index: number) => void;
  onDragUpdate: (targetIndex: number) => void;
  onDragEnd: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  totalItems: number;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 0.5,
};

/**
 * DraggableItem - wrapper for items in a reorderable list
 * Uses react-native-gesture-handler and reanimated for smooth drag interactions
 */
export const DraggableItem: React.FC<DraggableItemProps> = ({
  id,
  index,
  itemHeight,
  isDragging,
  isBeingDragged,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onPress,
  onLongPress,
  children,
  style,
  totalItems,
}) => {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(0);
  const opacity = useSharedValue(1);
  const shadowOpacity = useSharedValue(0);
  const lastNotifiedIndexRef = useRef<number>(index);

  // Pan gesture for dragging
  const panGesture: PanGesture = Gesture.Pan()
    .activateAfterLongPress(300) // Long press to start drag
    .onStart(() => {
      'worklet';
      scale.value = withSpring(1.05, SPRING_CONFIG);
      zIndex.value = 999;
      shadowOpacity.value = withTiming(0.3, { duration: 150 });
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      runOnJS(onDragStart)(id, index);
    })
    .onUpdate((event) => {
      'worklet';
      translateY.value = event.translationY;
      const targetIndex = Math.max(
        0,
        Math.min(
          totalItems - 1,
          index + Math.round(event.translationY / itemHeight)
        )
      );
      // Trigger light haptic when crossing each item boundary
      if (targetIndex !== lastNotifiedIndexRef.current) {
        lastNotifiedIndexRef.current = targetIndex;
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      }
      runOnJS(onDragUpdate)(targetIndex);
    })
    .onEnd(() => {
      'worklet';
      translateY.value = withSpring(0, SPRING_CONFIG);
      scale.value = withSpring(1, SPRING_CONFIG);
      zIndex.value = 0;
      shadowOpacity.value = withTiming(0, { duration: 150 });
      lastNotifiedIndexRef.current = index;
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      runOnJS(onDragEnd)();
    })
    .onFinalize(() => {
      'worklet';
      translateY.value = withSpring(0, SPRING_CONFIG);
      scale.value = withSpring(1, SPRING_CONFIG);
      zIndex.value = 0;
      shadowOpacity.value = withTiming(0, { duration: 150 });
    });

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    // Calculate offset when another item is being dragged
    const offset = 0;
    if (isDragging && !isBeingDragged) {
      // This item should move to make room for the dragged item
      // Handled by parent component reordering
    }

    return {
      transform: [
        { translateY: translateY.value + offset },
        { scale: scale.value },
      ],
      zIndex: zIndex.value,
      opacity: opacity.value,
      shadowOpacity: shadowOpacity.value,
    };
  });

  // Handle tap (for editing)
  const handlePress = useCallback(() => {
    if (!isDragging) {
      onPress?.();
    }
  }, [isDragging, onPress]);

  // Handle long press (alternative to gesture drag)
  const handleLongPress = useCallback(() => {
    onLongPress?.();
  }, [onLongPress]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, style, animatedStyle]}>
        <TouchableOpacity
          style={styles.contentWrapper}
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.7}
          disabled={isBeingDragged}
        >
          {/* Drag handle indicator */}
          <View style={styles.dragHandle}>
            <Ionicons name="reorder-three" size={20} color="#999" />
          </View>

          {/* Main content */}
          <View style={styles.content}>{children}</View>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  content: {
    flex: 1,
  },
});
