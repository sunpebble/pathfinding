import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

/**
 * Blog index route - placeholder for future blog list feature
 * Note: Blog post listing is out of scope for initial implementation
 */
export default function BlogIndexScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="book-outline" size={64} color="#C0C0C0" />
      <Text variant="headlineSmall" style={styles.title}>
        旅行博文
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        即将推出
      </Text>
      <Text variant="bodySmall" style={styles.description}>
        精彩的旅行日记和攻略分享正在路上
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 24,
  },
  title: {
    marginTop: 16,
    color: '#333',
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 8,
    color: '#666',
  },
  description: {
    marginTop: 4,
    color: '#999',
    textAlign: 'center',
  },
});
