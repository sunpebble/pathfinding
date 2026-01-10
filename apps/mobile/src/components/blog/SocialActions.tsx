import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

interface SocialActionsProps {
  title: string;
  shareUrl?: string;
  isLiked: boolean;
  likeCount: number;
  onLikePress: () => void;
}

/**
 * SocialActions - displays like and share buttons for blog posts
 */
export const SocialActions: React.FC<SocialActionsProps> = ({
  title,
  shareUrl,
  isLiked,
  likeCount,
  onLikePress,
}) => {
  const handleShare = async () => {
    try {
      // Include URL in message for Android compatibility
      const message = Platform.OS === 'ios'
        ? title
        : `${title}${shareUrl ? `\n${shareUrl}` : ''}`;

      await Share.share({
        message,
        url: shareUrl, // iOS only
        title,
      });
    } catch (error) {
      // User cancelled or share failed - silently handle
    }
  };

  return (
    <View style={styles.container}>
      {/* Like button */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onLikePress}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={24}
          color={isLiked ? '#FF3B30' : '#666'}
        />
        <Text style={[styles.actionText, isLiked && styles.likedText]}>
          {likeCount > 0 ? likeCount : '点赞'}
        </Text>
      </TouchableOpacity>

      {/* Share button */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleShare}
        activeOpacity={0.7}
      >
        <Ionicons name="share-social-outline" size={24} color="#666" />
        <Text style={styles.actionText}>转发</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  likedText: {
    color: '#FF3B30',
  },
});
