import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { DaySection } from "./DaySection";
import type { ItineraryDay, ItineraryItem } from "@pathfinding/types";

interface TimelineViewProps {
  days: (ItineraryDay & { items?: ItineraryItem[] })[];
  onAddItem?: (dayId: string) => void;
  onItemPress?: (item: ItineraryItem) => void;
  isEditing?: boolean;
}

/**
 * Timeline view component showing all days and items
 */
export function TimelineView({
  days,
  onAddItem,
  onItemPress,
  isEditing = false,
}: TimelineViewProps) {
  if (days.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>暂无行程安排</Text>
        <Text style={styles.emptySubtitle}>创建行程后会自动生成日期框架</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {days.map((day, index) => (
        <DaySection
          key={day.id}
          day={day}
          dayIndex={index}
          items={day.items || []}
          onAddItem={onAddItem ? () => onAddItem(day.id) : undefined}
          onItemPress={onItemPress}
          isEditing={isEditing}
          isLastDay={index === days.length - 1}
        />
      ))}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  bottomSpacer: {
    height: 100,
  },
});
