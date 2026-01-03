-- Migration: 015_create_data_quality_reports
-- Description: Create data_quality_reports table for pipeline monitoring

CREATE TABLE data_quality_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Scope
  report_type VARCHAR(50) NOT NULL,  -- 'daily', 'weekly', 'monthly', 'on_demand'
  scope_platform VARCHAR(50),  -- null means all platforms
  scope_city VARCHAR(100),  -- null means all cities
  
  -- Time range
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Metrics
  metrics JSONB NOT NULL,
  /*
    {
      "completeness": {
        "total_pois": 50000,
        "with_description": 45000,
        "with_photos": 40000,
        "with_ratings": 48000,
        "with_hours": 30000,
        "completeness_rate": 0.85
      },
      "freshness": {
        "updated_last_24h": 5000,
        "updated_last_7d": 30000,
        "stale_30d": 5000,
        "freshness_rate": 0.90
      },
      "accuracy": {
        "duplicates_found": 500,
        "duplicates_merged": 480,
        "conflicts_resolved": 450,
        "accuracy_rate": 0.99
      },
      "coverage": {
        "cities_covered": 50,
        "categories_covered": 12,
        "avg_pois_per_city": 1000
      }
    }
  */
  
  -- Anomalies
  anomalies JSONB DEFAULT '[]',
  /*
    [
      {
        "type": "spike",
        "description": "Abnormally high crawl failure rate",
        "severity": "high",
        "affected_platform": "platform_x",
        "details": {}
      }
    ]
  */
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX idx_data_quality_reports_type ON data_quality_reports(report_type);
CREATE INDEX idx_data_quality_reports_period ON data_quality_reports(period_start, period_end);
CREATE INDEX idx_data_quality_reports_platform ON data_quality_reports(scope_platform);
CREATE INDEX idx_data_quality_reports_created ON data_quality_reports(created_at DESC);
