-- Migration: 012_create_poi_reviews
-- Description: Create poi_reviews table for storing POI review data

CREATE TABLE poi_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id UUID NOT NULL REFERENCES normalized_pois(id) ON DELETE CASCADE,
  raw_record_id UUID REFERENCES raw_crawl_records(id),
  
  -- Review content
  content TEXT NOT NULL,
  content_language VARCHAR(10),  -- 'zh', 'en', etc.
  
  -- Rating
  rating DECIMAL(3, 2),  -- 0.00 - 5.00
  rating_breakdown JSONB,
  
  -- Author information (anonymized)
  author_name VARCHAR(100),
  author_avatar_hash VARCHAR(64),  -- Avatar hash, not original URL
  author_level VARCHAR(50),
  
  -- Metadata
  published_at TIMESTAMPTZ,
  helpful_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  
  -- Sentiment analysis (optional)
  sentiment_score DECIMAL(3, 2),  -- -1.00 to 1.00
  sentiment_label VARCHAR(20),  -- 'positive', 'neutral', 'negative'
  
  -- Source information
  source_platform VARCHAR(50) NOT NULL,
  source_external_id VARCHAR(255),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_poi_reviews_poi ON poi_reviews(poi_id);
CREATE INDEX idx_poi_reviews_rating ON poi_reviews(rating DESC NULLS LAST);
CREATE INDEX idx_poi_reviews_sentiment ON poi_reviews(sentiment_label);
CREATE INDEX idx_poi_reviews_published ON poi_reviews(published_at DESC);
CREATE INDEX idx_poi_reviews_platform ON poi_reviews(source_platform);

-- Full-text search for review content
CREATE INDEX idx_poi_reviews_content_search ON poi_reviews USING GIN (to_tsvector('simple', content));
