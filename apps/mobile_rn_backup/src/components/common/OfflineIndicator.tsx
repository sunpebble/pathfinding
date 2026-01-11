import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface OfflineIndicatorProps {
  showSyncButton?: boolean;
}

/**
 * Indicator component showing offline status and sync state
 */
export function OfflineIndicator({
  showSyncButton = true,
}: OfflineIndicatorProps) {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt: _lastSyncAt,
    error,
    syncAll,
  } = useOfflineSync();

  // Don't show anything if online and no pending items
  if (isOnline && pendingCount === 0 && !error) {
    return null;
  }

  return (
    <View style={[styles.container, !isOnline && styles.offline]}>
      <View style={styles.content}>
        {/* Status icon */}
        <View style={styles.iconContainer}>
          {isSyncing ? (
            <Ionicons name="sync" size={18} color="#fff" />
          ) : !isOnline ? (
            <Ionicons name="cloud-offline" size={18} color="#fff" />
          ) : pendingCount > 0 ? (
            <Ionicons name="cloud-upload" size={18} color="#fff" />
          ) : error ? (
            <Ionicons name="warning" size={18} color="#fff" />
          ) : null}
        </View>

        {/* Status text */}
        <Text style={styles.text}>
          {isSyncing
            ? '正在同步...'
            : !isOnline
              ? '离线模式'
              : pendingCount > 0
                ? `${pendingCount} 项待同步`
                : error
                  ? '同步失败'
                  : ''}
        </Text>

        {/* Sync button */}
        {showSyncButton && isOnline && pendingCount > 0 && !isSyncing && (
          <TouchableOpacity style={styles.syncButton} onPress={syncAll}>
            <Text style={styles.syncButtonText}>同步</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error message */}
      {error && (
        <Text style={styles.errorText} numberOfLines={1}>
          {error}
        </Text>
      )}
    </View>
  );
}

/**
 * Compact offline badge for use in headers
 */
export function OfflineBadge() {
  const { isOnline, pendingCount } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Ionicons
        name={isOnline ? 'cloud-upload' : 'cloud-offline'}
        size={14}
        color="#fff"
      />
      {pendingCount > 0 && (
        <View style={styles.badgeCount}>
          <Text style={styles.badgeCountText}>
            {pendingCount > 9 ? '9+' : pendingCount}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offline: {
    backgroundColor: '#8E8E93',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 4,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8E8E93',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCount: {
    marginLeft: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default OfflineIndicator;
