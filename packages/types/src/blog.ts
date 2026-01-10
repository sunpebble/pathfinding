/**
 * Blog post visibility enum
 */
export type BlogPostVisibility = 'draft' | 'private' | 'public';

/**
 * BlogLocation entity - location marker for a blog post
 */
export interface BlogLocation {
  id: string;
  blogPostId: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * TravelBlogPost entity - travel diary/blog post
 */
export interface TravelBlogPost {
  id: string;
  userId: string;
  title: string;
  content: string;
  coverImageUrl?: string;
  source?: string;
  sourceUrl?: string;
  visibility: BlogPostVisibility;
  publishedAt?: Date;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
  // Populated relations
  locations?: BlogLocation[];
  authorName?: string;
  authorAvatarUrl?: string;
}

/**
 * Blog post input for creating a new blog post
 */
export interface CreateBlogPostInput {
  title: string;
  content: string;
  coverImageUrl?: string;
  source?: string;
  sourceUrl?: string;
  visibility?: BlogPostVisibility;
}

/**
 * Blog post update input for partial updates
 */
export interface UpdateBlogPostInput {
  title?: string;
  content?: string;
  coverImageUrl?: string;
  source?: string;
  sourceUrl?: string;
  visibility?: BlogPostVisibility;
  publishedAt?: Date | string;
}

/**
 * Blog location input for creating a new location marker
 */
export interface CreateBlogLocationInput {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  order?: number;
}

/**
 * Blog post list filters
 */
export interface BlogPostFilters {
  userId?: string;
  visibility?: BlogPostVisibility;
  publishedFrom?: Date | string;
  publishedTo?: Date | string;
}

/**
 * Blog post with computed fields for display
 */
export interface BlogPostWithStats extends TravelBlogPost {
  locationsCount: number;
  isLiked?: boolean;
}
