-- Migration: 013_create_poi_source_mappings
-- Description: Create poi_source_mappings table for cross-platform ID mapping

CREATE TABLE poi_source_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id UUID NOT NULL REFERENCES normalized_pois(id) ON DELETE CASCADE,
  
  platform VARCHAR(50) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  external_url TEXT,
  
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.00,  -- Mapping confidence
  match_method VARCHAR(50),  -- 'exact_id', 'name_location', 'manual'
  
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(platform, external_id)
);

-- Indexes for lookups
CREATE INDEX idx_poi_source_mappings_poi ON poi_source_mappings(poi_id);
CREATE INDEX idx_poi_source_mappings_lookup ON poi_source_mappings(platform, external_id);
CREATE INDEX idx_poi_source_mappings_verified ON poi_source_mappings(last_verified_at DESC);
