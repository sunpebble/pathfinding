import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArticleMetadata, BlogMapView, SocialActions } from '@/components/blog';
import { useBlogStore } from '@/store/blogStore';

/**
 * Screen for displaying blog post details with diary content, map, metadata, and social actions
 */
export function BlogPostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    currentBlogPost,
    isLoading,
    isTogglingLike,
    error,
    fetchBlogPost,
    toggleLike,
    clearCurrentPost,
  } = useBlogStore();

  useEffect(() => {
    if (id) {
      fetchBlogPost(id);
    }
    return () => {
      clearCurrentPost();
    };
  }, [id, fetchBlogPost, clearCurrentPost]);

  const handleLike = useCallback(() => {
    if (id && !isTogglingLike) {
      toggleLike(id);
    }
  }, [id, isTogglingLike, toggleLike]);

  const handleRetry = useCallback(() => {
    if (id) {
      fetchBlogPost(id);
    }
  }, [id, fetchBlogPost]);

  // Loading state
  if (isLoading && !currentBlogPost) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Error state
  if (error && !currentBlogPost) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#CCC" />
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>返回</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Not found state
  if (!currentBlogPost) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#CCC" />
        <Text style={styles.errorText}>博文不存在或已被删除</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with title */}
        <View style={styles.header}>
          <Text style={styles.title}>{currentBlogPost.title}</Text>

          {/* Article metadata (source and date) */}
          <ArticleMetadata
            source={currentBlogPost.source}
            sourceUrl={currentBlogPost.sourceUrl}
            publishedAt={currentBlogPost.publishedAt}
          />
        </View>

        {/* Map with location markers */}
        <View style={styles.mapSection}>
          <BlogMapView
            locations={currentBlogPost.locations || []}
            height={250}
          />
        </View>

        {/* Blog content (diary) */}
        <View style={styles.contentSection}>
          <Text style={styles.content}>{currentBlogPost.content}</Text>
        </View>
      </ScrollView>

      {/* Social actions (like and share) */}
      <SocialActions
        title={currentBlogPost.title}
        shareUrl={currentBlogPost.sourceUrl}
        isLiked={currentBlogPost.isLiked ?? false}
        likeCount={currentBlogPost.likeCount}
        onLikePress={handleLike}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#E5E5E5',
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  mapSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  contentSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  content: {
    fontSize: 16,
    color: '#333',
    lineHeight: 26,
  },
});

export default BlogPostDetailScreen;
