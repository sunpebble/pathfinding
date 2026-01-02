import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getRelativeTime, formatDate } from "@pathfinding/utils";
import type { ItineraryWithStats } from "@pathfinding/types";

interface ItineraryCardProps {
  itinerary: ItineraryWithStats;
  onPress: () => void;
  onOptionsPress?: () => void;
}

/**
 * Card component for displaying itinerary in list
 */
export function ItineraryCard({ itinerary, onPress, onOptionsPress }: ItineraryCardProps) {
  const startDate = new Date(itinerary.startDate);
  const endDate = new Date(itinerary.endDate);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {itinerary.coverImageUrl ? (
        <Image
          source={{ uri: itinerary.coverImageUrl }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.coverImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={40} color="#CCC" />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {itinerary.title}
          </Text>
          {onOptionsPress && (
            <TouchableOpacity
              onPress={onOptionsPress}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{itinerary.cityName || "未知城市"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {formatDate(startDate)} - {formatDate(endDate)}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{itinerary.daysCount}天</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.statsRow}>
            <Ionicons name="list-outline" size={14} color="#999" />
            <Text style={styles.statsText}>{itinerary.itemsCount || 0} 个景点</Text>
          </View>
          <Text style={styles.timeAgo}>{getRelativeTime(itinerary.updatedAt, "zh")}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  coverImage: {
    width: "100%",
    height: 140,
  },
  placeholderImage: {
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#E3F2FD",
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#999",
  },
  timeAgo: {
    fontSize: 12,
    color: "#999",
  },
});
