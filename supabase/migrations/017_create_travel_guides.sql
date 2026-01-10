-- Travel Guides Table
-- Stores crawled travel guide content from various platforms

CREATE TABLE IF NOT EXISTS travel_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source information
  source_platform TEXT NOT NULL CHECK (source_platform IN ('xiaohongshu', 'weibo', 'ctrip')),
  source_external_id TEXT NOT NULL,
  source_url TEXT,
  
  -- Content
  title TEXT,
  content TEXT NOT NULL,
  author_name TEXT,
  author_id TEXT,
  
  -- Extracted metadata
  destinations TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  
  -- Engagement metrics
  likes_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  
  -- Media
  cover_image_url TEXT,
  image_urls TEXT[] DEFAULT '{}',
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Quality & deduplication
  quality_score DECIMAL(3,2) DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 1),
  content_hash TEXT,
  
  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for deduplication
  CONSTRAINT unique_guide_per_platform UNIQUE (source_platform, source_external_id)
);

-- Guide Recommendations Table
-- Stores personalized recommendations for users
CREATE TABLE IF NOT EXISTS guide_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id UUID REFERENCES travel_guides(id) ON DELETE CASCADE,
  score DECIMAL(5,4) NOT NULL CHECK (score >= 0 AND score <= 1),
  reason TEXT,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_recommendation UNIQUE (user_id, guide_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_guides_destinations ON travel_guides USING GIN (destinations);
CREATE INDEX idx_guides_tags ON travel_guides USING GIN (tags);
CREATE INDEX idx_guides_platform ON travel_guides (source_platform);
CREATE INDEX idx_guides_quality ON travel_guides (quality_score DESC);
CREATE INDEX idx_guides_published ON travel_guides (published_at DESC);
CREATE INDEX idx_guides_content_hash ON travel_guides (content_hash);

CREATE INDEX idx_recommendations_user ON guide_recommendations (user_id);
CREATE INDEX idx_recommendations_score ON guide_recommendations (score DESC);

-- Update trigger for updated_at
CREATE TRIGGER update_travel_guides_updated_at
  BEFORE UPDATE ON travel_guides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE travel_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for travel_guides (public read, service role write)
CREATE POLICY "Travel guides are viewable by everyone"
  ON travel_guides FOR SELECT
  USING (true);

CREATE POLICY "Travel guides are insertable by service role"
  ON travel_guides FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Travel guides are updatable by service role"
  ON travel_guides FOR UPDATE
  USING (auth.role() = 'service_role');

-- RLS Policies for guide_recommendations (user-specific)
CREATE POLICY "Users can view their own recommendations"
  ON guide_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all recommendations"
  ON guide_recommendations FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE travel_guides IS 'Stores travel guide content crawled from platforms like Xiaohongshu, Weibo, and Ctrip';
COMMENT ON TABLE guide_recommendations IS 'Personalized travel guide recommendations for users';
