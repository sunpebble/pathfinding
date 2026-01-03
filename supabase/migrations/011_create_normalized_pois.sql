-- Migration: 011_create_normalized_pois
-- Description: Create normalized_pois table for unified POI data (Silver Layer)

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE normalized_pois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id UUID,  -- Self-reference for deduplicated master record
  
  -- Basic information
  name VARCHAR(500) NOT NULL,
  name_en VARCHAR(500),
  name_aliases TEXT[],  -- Alias list
  description TEXT,
  
  -- Classification
  category VARCHAR(100) NOT NULL,  -- Unified category: 'restaurant', 'attraction', 'hotel', 'shopping', etc.
  subcategory VARCHAR(100),
  tags TEXT[],
  
  -- Location
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  location_point GEOGRAPHY(POINT, 4326),  -- PostGIS geography type
  address TEXT,
  city VARCHAR(100),
  district VARCHAR(100),
  country VARCHAR(100) DEFAULT 'CN',
  postal_code VARCHAR(20),
  
  -- Ratings
  rating_overall DECIMAL(3, 2),  -- 0.00 - 5.00
  rating_count INTEGER DEFAULT 0,
  rating_breakdown JSONB,  -- {"food": 4.5, "service": 4.2, "environment": 4.0}
  
  -- Business information
  operating_hours JSONB,
  /*
    {
      "monday": {"open": "09:00", "close": "22:00"},
      "tuesday": {"open": "09:00", "close": "22:00"},
      ...
      "exceptions": [{"date": "2026-01-01", "closed": true}]
    }
  */
  price_range VARCHAR(50),  -- '¥', '¥¥', '¥¥¥', '¥¥¥¥'
  price_avg DECIMAL(10, 2),
  
  -- Contact information
  phone VARCHAR(50),
  website VARCHAR(500),
  
  -- Media
  photos_count INTEGER DEFAULT 0,
  photo_urls TEXT[],
  
  -- Data quality
  quality_score DECIMAL(3, 2) DEFAULT 0.00,  -- 0.00 - 1.00
  completeness_score DECIMAL(3, 2) DEFAULT 0.00,
  freshness_score DECIMAL(3, 2) DEFAULT 0.00,
  
  -- Multi-source attribution
  sources JSONB NOT NULL DEFAULT '[]',
  /*
    [
      {
        "platform": "amap",
        "external_id": "B000A8WSBZ",
        "url": "https://...",
        "confidence": 0.95,
        "last_crawled": "2026-01-04T10:00:00Z"
      }
    ]
  */
  
  -- Deduplication info
  is_duplicate BOOLEAN DEFAULT FALSE,
  merge_confidence DECIMAL(3, 2),
  
  -- Timestamps
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for geo queries
CREATE INDEX idx_normalized_pois_location ON normalized_pois USING GIST (location_point);

-- Query indexes
CREATE INDEX idx_normalized_pois_category ON normalized_pois(category);
CREATE INDEX idx_normalized_pois_city ON normalized_pois(city);
CREATE INDEX idx_normalized_pois_rating ON normalized_pois(rating_overall DESC NULLS LAST);
CREATE INDEX idx_normalized_pois_quality ON normalized_pois(quality_score DESC);
CREATE INDEX idx_normalized_pois_canonical ON normalized_pois(canonical_id) WHERE canonical_id IS NOT NULL;
CREATE INDEX idx_normalized_pois_duplicate ON normalized_pois(is_duplicate) WHERE is_duplicate = TRUE;
CREATE INDEX idx_normalized_pois_updated ON normalized_pois(last_updated_at DESC);

-- Full-text search index
CREATE INDEX idx_normalized_pois_name_search ON normalized_pois USING GIN (to_tsvector('simple', name));

-- Trigger to auto-populate location_point
CREATE OR REPLACE FUNCTION update_normalized_pois_location_point()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326)::geography;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalized_pois_location_point
  BEFORE INSERT OR UPDATE OF location_lat, location_lng ON normalized_pois
  FOR EACH ROW
  EXECUTE FUNCTION update_normalized_pois_location_point();
