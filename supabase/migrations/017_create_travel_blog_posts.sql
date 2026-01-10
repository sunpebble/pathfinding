-- Supabase Migration: 017_create_travel_blog_posts.sql
-- Travel blog posts with location markers and likes tracking

-- Create blog post visibility enum
CREATE TYPE blog_post_visibility AS ENUM (
  'draft',
  'private',
  'public'
);

-- Main travel_blog_posts table
CREATE TABLE IF NOT EXISTS public.travel_blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  source VARCHAR(200),
  source_url TEXT,
  visibility blog_post_visibility NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  -- Store locations as JSONB array for efficient querying
  -- Each location: { id, name, description, latitude, longitude, order }
  locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_travel_blog_posts_user_id ON public.travel_blog_posts(user_id);
CREATE INDEX idx_travel_blog_posts_visibility ON public.travel_blog_posts(visibility);
CREATE INDEX idx_travel_blog_posts_published_at ON public.travel_blog_posts(published_at DESC NULLS LAST);
CREATE INDEX idx_travel_blog_posts_created_at ON public.travel_blog_posts(created_at DESC);
CREATE INDEX idx_travel_blog_posts_like_count ON public.travel_blog_posts(like_count DESC);

-- GIN index for JSONB locations for efficient querying
CREATE INDEX idx_travel_blog_posts_locations ON public.travel_blog_posts USING GIN (locations);

-- Index for public blog posts discovery
CREATE INDEX idx_travel_blog_posts_public ON public.travel_blog_posts(visibility, published_at DESC)
  WHERE visibility = 'public';

-- Blog post likes table for tracking individual likes
CREATE TABLE IF NOT EXISTS public.travel_blog_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID NOT NULL REFERENCES public.travel_blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user can only like a post once
  CONSTRAINT unique_blog_post_like UNIQUE (blog_post_id, user_id)
);

-- Indexes for likes table
CREATE INDEX idx_travel_blog_post_likes_blog_post_id ON public.travel_blog_post_likes(blog_post_id);
CREATE INDEX idx_travel_blog_post_likes_user_id ON public.travel_blog_post_likes(user_id);

-- RLS for travel_blog_posts
ALTER TABLE public.travel_blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view public blog posts
CREATE POLICY "Anyone can view public blog posts"
  ON public.travel_blog_posts FOR SELECT
  USING (visibility = 'public');

-- Users can view their own blog posts (any visibility)
CREATE POLICY "Users can view own blog posts"
  ON public.travel_blog_posts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own blog posts
CREATE POLICY "Users can insert own blog posts"
  ON public.travel_blog_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own blog posts
CREATE POLICY "Users can update own blog posts"
  ON public.travel_blog_posts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own blog posts
CREATE POLICY "Users can delete own blog posts"
  ON public.travel_blog_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all blog posts
CREATE POLICY "Service role can manage blog posts"
  ON public.travel_blog_posts FOR ALL
  USING (auth.role() = 'service_role');

-- RLS for travel_blog_post_likes
ALTER TABLE public.travel_blog_post_likes ENABLE ROW LEVEL SECURITY;

-- Users can view all likes on public posts (for like count display)
CREATE POLICY "Anyone can view likes on public posts"
  ON public.travel_blog_post_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_blog_posts
      WHERE id = blog_post_id AND visibility = 'public'
    )
  );

-- Users can view their own likes
CREATE POLICY "Users can view own likes"
  ON public.travel_blog_post_likes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can like public posts
CREATE POLICY "Users can like public posts"
  ON public.travel_blog_post_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.travel_blog_posts
      WHERE id = blog_post_id AND visibility = 'public'
    )
  );

-- Users can unlike (delete their own likes)
CREATE POLICY "Users can delete own likes"
  ON public.travel_blog_post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to toggle like and update like_count atomically
CREATE OR REPLACE FUNCTION public.toggle_blog_post_like(
  p_blog_post_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_liked BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if already liked
  IF EXISTS (
    SELECT 1 FROM public.travel_blog_post_likes
    WHERE blog_post_id = p_blog_post_id AND user_id = v_user_id
  ) THEN
    -- Unlike: remove like and decrement count
    DELETE FROM public.travel_blog_post_likes
    WHERE blog_post_id = p_blog_post_id AND user_id = v_user_id;

    UPDATE public.travel_blog_posts
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = p_blog_post_id;

    v_liked := FALSE;
  ELSE
    -- Like: add like and increment count
    INSERT INTO public.travel_blog_post_likes (blog_post_id, user_id)
    VALUES (p_blog_post_id, v_user_id);

    UPDATE public.travel_blog_posts
    SET like_count = like_count + 1
    WHERE id = p_blog_post_id;

    v_liked := TRUE;
  END IF;

  RETURN v_liked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has liked a post
CREATE OR REPLACE FUNCTION public.has_liked_blog_post(
  p_blog_post_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.travel_blog_post_likes
    WHERE blog_post_id = p_blog_post_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.toggle_blog_post_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_liked_blog_post(UUID) TO authenticated;

-- Updated_at trigger for travel_blog_posts
CREATE TRIGGER update_travel_blog_posts_updated_at
  BEFORE UPDATE ON public.travel_blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for blog posts (for live like count updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.travel_blog_posts;
