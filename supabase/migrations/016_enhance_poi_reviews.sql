-- Migration: 016_enhance_poi_reviews
-- Description: Enhance poi_reviews table with sentiment keywords and additional indexes

-- Add sentiment keywords column for storing detected keywords
ALTER TABLE poi_reviews 
ADD COLUMN IF NOT EXISTS sentiment_keywords TEXT[];

-- Add confidence score for sentiment analysis
ALTER TABLE poi_reviews 
ADD COLUMN IF NOT EXISTS sentiment_confidence DECIMAL(3, 2);

-- Create index for sentiment keywords (GIN for array search)
CREATE INDEX IF NOT EXISTS idx_poi_reviews_sentiment_keywords 
ON poi_reviews USING GIN (sentiment_keywords);

-- Create composite index for POI + sentiment queries
CREATE INDEX IF NOT EXISTS idx_poi_reviews_poi_sentiment 
ON poi_reviews(poi_id, sentiment_label);

-- Create index for high-quality reviews (high helpful count)
CREATE INDEX IF NOT EXISTS idx_poi_reviews_helpful 
ON poi_reviews(helpful_count DESC) 
WHERE helpful_count > 0;

-- Add comment explaining the table
COMMENT ON TABLE poi_reviews IS 'Stores user reviews for POIs with sentiment analysis';
COMMENT ON COLUMN poi_reviews.sentiment_score IS 'Sentiment score from -1.0 (negative) to 1.0 (positive)';
COMMENT ON COLUMN poi_reviews.sentiment_label IS 'Sentiment category: positive, neutral, or negative';
COMMENT ON COLUMN poi_reviews.sentiment_keywords IS 'Keywords detected during sentiment analysis';
COMMENT ON COLUMN poi_reviews.sentiment_confidence IS 'Confidence score for sentiment analysis (0-1)';
