-- Migration: 009_create_crawl_jobs
-- Description: Create crawl_jobs table for managing crawl task configuration and execution

CREATE TABLE crawl_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,  -- 'amap', 'baidu', 'openstreetmap', etc.
  job_type VARCHAR(20) NOT NULL DEFAULT 'full',  -- 'full', 'incremental'
  
  -- Configuration
  config JSONB NOT NULL DEFAULT '{}',
  /*
    config schema:
    {
      "geographic_scope": {
        "cities": ["北京", "上海"],
        "bounds": { "ne": [lat, lng], "sw": [lat, lng] }
      },
      "categories": ["restaurant", "attraction", "hotel"],
      "rate_limit": {
        "requests_per_second": 1,
        "max_concurrent": 5
      },
      "filters": {}
    }
  */
  
  -- Scheduling
  schedule_cron VARCHAR(100),  -- cron expression, null means manual trigger
  next_run_at TIMESTAMPTZ,
  
  -- Execution status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Statistics
  statistics JSONB DEFAULT '{}',
  /*
    statistics schema:
    {
      "requests_total": 1000,
      "requests_success": 950,
      "requests_failed": 50,
      "records_extracted": 5000,
      "bytes_downloaded": 10485760,
      "duration_seconds": 3600
    }
  */
  
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_crawl_jobs_status ON crawl_jobs(status);
CREATE INDEX idx_crawl_jobs_platform ON crawl_jobs(platform);
CREATE INDEX idx_crawl_jobs_next_run ON crawl_jobs(next_run_at) WHERE status = 'pending';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_crawl_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER crawl_jobs_updated_at
  BEFORE UPDATE ON crawl_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_crawl_jobs_updated_at();
