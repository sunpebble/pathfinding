import type {
  BlogLocation,
  BlogPostWithStats,
  TravelBlogPost,
} from '@pathfinding/types';
import { supabase } from '@/lib/supabase';

/**
 * Database row type for travel_blog_posts table
 */
interface BlogPostRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  source: string | null;
  source_url: string | null;
  visibility: 'draft' | 'private' | 'public';
  published_at: string | null;
  like_count: number;
  locations: unknown[];
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for locations in JSONB
 */
interface LocationRow {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  order: number;
}

/**
 * Transform database row to TravelBlogPost type
 */
function transformBlogPost(row: BlogPostRow): TravelBlogPost {
  const locations: BlogLocation[] = (row.locations as LocationRow[]).map(
    (loc) => ({
      id: loc.id,
      blogPostId: row.id,
      name: loc.name,
      description: loc.description,
      latitude: loc.latitude,
      longitude: loc.longitude,
      order: loc.order,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    })
  );

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    coverImageUrl: row.cover_image_url ?? undefined,
    source: row.source ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    visibility: row.visibility,
    publishedAt: row.published_at ? new Date(row.published_at) : undefined,
    likeCount: row.like_count,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    locations,
  };
}

/**
 * Blog service for Supabase data fetching
 * Uses Supabase client directly for blog post operations
 */
export const blogService = {
  /**
   * Get a blog post by ID
   * Returns the blog post with locations and author info
   */
  async getById(id: string): Promise<BlogPostWithStats> {
    // Fetch the blog post
    const { data: post, error: postError } = await supabase
      .from('travel_blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (postError) {
      if (postError.code === 'PGRST116') {
        throw new Error('Blog post not found');
      }
      throw new Error(postError.message || 'Failed to fetch blog post');
    }

    if (!post) {
      throw new Error('Blog post not found');
    }

    const blogPost = transformBlogPost(post as BlogPostRow);

    // Check if current user has liked this post
    let isLiked = false;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.id) {
      const { data: likeData } = await supabase.rpc('has_liked_blog_post', {
        p_blog_post_id: id,
      });
      isLiked = likeData === true;
    }

    // Fetch author info from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', blogPost.userId)
      .single();

    return {
      ...blogPost,
      authorName: profile?.display_name ?? undefined,
      authorAvatarUrl: profile?.avatar_url ?? undefined,
      locationsCount: blogPost.locations?.length ?? 0,
      isLiked,
    };
  },

  /**
   * Toggle like status for a blog post
   * Returns the new like state (true if liked, false if unliked)
   */
  async toggleLike(
    id: string
  ): Promise<{ isLiked: boolean; likeCount: number }> {
    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      throw new Error('Authentication required to like posts');
    }

    // Toggle like using the database function
    const { data: isLiked, error } = await supabase.rpc(
      'toggle_blog_post_like',
      {
        p_blog_post_id: id,
      }
    );

    if (error) {
      throw new Error(error.message || 'Failed to toggle like');
    }

    // Fetch updated like count
    const { data: post, error: fetchError } = await supabase
      .from('travel_blog_posts')
      .select('like_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(
        fetchError.message || 'Failed to fetch updated like count'
      );
    }

    return {
      isLiked: isLiked === true,
      likeCount: post?.like_count ?? 0,
    };
  },

  /**
   * Check if the current user has liked a blog post
   */
  async hasLiked(id: string): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return false;
    }

    const { data } = await supabase.rpc('has_liked_blog_post', {
      p_blog_post_id: id,
    });

    return data === true;
  },
};
