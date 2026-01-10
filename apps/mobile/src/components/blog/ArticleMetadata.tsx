import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@pathfinding/utils';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface ArticleMetadataProps {
  source?: string;
  sourceUrl?: string;
  publishedAt?: Date | string;
}

/**
 * ArticleMetadata - displays article source and publication date
 */
export const ArticleMetadata: React.FC<ArticleMetadataProps> = ({
  source,
  publishedAt,
}) => {
  const formattedDate = publishedAt
    ? formatDate(
        typeof publishedAt === 'string' ? new Date(publishedAt) : publishedAt
      )
    : null;

  // Don't render if no metadata available
  if (!source && !formattedDate) {
    return null;
  }

  return (
    <View style={styles.container}>
      {source && (
        <View style={styles.metaRow}>
          <Ionicons name="document-text-outline" size={14} color="#666" />
          <Text style={styles.metaText}>{source}</Text>
        </View>
      )}
      {formattedDate && (
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color="#666" />
          <Text style={styles.metaText}>{formattedDate}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
});
