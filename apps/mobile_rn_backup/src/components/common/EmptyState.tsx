import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type EmptyStateType =
  | 'itineraries'
  | 'items'
  | 'search'
  | 'network'
  | 'error'
  | 'community';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

// Default content for each empty state type
const EMPTY_STATE_CONTENT: Record<
  EmptyStateType,
  { icon: keyof typeof Ionicons.glyphMap; title: string; message: string }
> = {
  itineraries: {
    icon: 'map-outline',
    title: '暂无行程',
    message: '创建你的第一个旅行行程吧',
  },
  items: {
    icon: 'location-outline',
    title: '暂无安排',
    message: '添加景点和美食到这一天',
  },
  search: {
    icon: 'search-outline',
    title: '没有找到结果',
    message: '试试其他关键词或筛选条件',
  },
  network: {
    icon: 'cloud-offline-outline',
    title: '网络不可用',
    message: '请检查网络连接后重试',
  },
  error: {
    icon: 'alert-circle-outline',
    title: '出错了',
    message: '加载失败，请稍后重试',
  },
  community: {
    icon: 'people-outline',
    title: '暂无公开行程',
    message: '成为第一个分享行程的人吧',
  },
};

/**
 * EmptyState - illustration and message for empty or error states
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  message,
  action,
}) => {
  const content = EMPTY_STATE_CONTENT[type];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={content.icon} size={64} color="#CCC" />
      </View>
      <Text style={styles.title}>{title || content.title}</Text>
      <Text style={styles.message}>{message || content.message}</Text>
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: 24,
  },
});
