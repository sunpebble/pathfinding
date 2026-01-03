-- Migration: 010_create_raw_crawl_records
-- Description: Create raw_crawl_records table for storing original crawled data (Bronze Layer)

CREATE TABLE raw_crawl_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
  
  -- Source information
  source_platform VARCHAR(50) NOT NULL,
  source_url TEXT NOT NULL,
  source_external_id VARCHAR(255),  -- Platform's ID
  
  -- Raw content
  raw_content TEXT NOT NULL,  -- Original HTML/JSON
  content_type VARCHAR(50) NOT NULL DEFAULT 'html',  -- 'html', 'json', 'xml'
  content_hash VARCHAR(64) NOT NULL,  -- SHA-256 for incremental detection
  content_size_bytes INTEGER NOT NULL,
  
  -- Crawl metadata
  http_status INTEGER,
  http_headers JSONB,
  crawler_version VARCHAR(20) NOT NULL,
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Parse status
  parse_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'success', 'failed', 'skipped'
  parse_error TEXT,
  parsed_at TIMESTAMPTZ,
  
  -- Link to normalized record
  normalized_poi_id UUID,  -- Reference to normalized_pois (filled after parsing)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_raw_crawl_records_job ON raw_crawl_records(job_id);
CREATE INDEX idx_raw_crawl_records_platform ON raw_crawl_records(source_platform);
CREATE INDEX idx_raw_crawl_records_hash ON raw_crawl_records(content_hash);
CREATE INDEX idx_raw_crawl_records_parse_status ON raw_crawl_records(parse_status);
CREATE INDEX idx_raw_crawl_records_external_id ON raw_crawl_records(source_platform, source_external_id);
CREATE INDEX idx_raw_crawl_records_crawled_at ON raw_crawl_records(crawled_at DESC);

-- Partial index for pending parse status
CREATE INDEX idx_raw_crawl_records_pending ON raw_crawl_records(job_id) WHERE parse_status = 'pending';
