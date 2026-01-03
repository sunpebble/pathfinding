import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TimeConflict {
  itemId: string;
  startTime: string;
  endTime: string;
  poiName?: string;
}

interface TimeConflictAlertProps {
  conflicts: TimeConflict[];
  onDismiss?: () => void;
}

/**
 * Alert component for displaying time conflicts between itinerary items
 */
export function TimeConflictAlert({
  conflicts,
  onDismiss: _onDismiss,
}: TimeConflictAlertProps) {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="warning" size={20} color="#FF9500" />
        <Text style={styles.title}>时间冲突提醒</Text>
      </View>
      <Text style={styles.description}>选择的时间段与以下行程存在冲突：</Text>
      {conflicts.map((conflict) => (
        <View key={conflict.itemId} style={styles.conflictItem}>
          <Ionicons name="time-outline" size={16} color="#FF9500" />
          <Text style={styles.conflictText}>
            {conflict.poiName || '活动'} ({conflict.startTime} -{' '}
            {conflict.endTime})
          </Text>
        </View>
      ))}
      <Text style={styles.hint}>您仍可以添加此行程，但请注意安排好时间。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFE4B5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B8860B',
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    color: '#996515',
    marginBottom: 8,
  },
  conflictItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 4,
  },
  conflictText: {
    fontSize: 13,
    color: '#996515',
    marginLeft: 6,
  },
  hint: {
    fontSize: 12,
    color: '#B8860B',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
