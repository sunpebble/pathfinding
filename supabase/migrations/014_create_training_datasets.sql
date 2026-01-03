-- Migration: 014_create_training_datasets
-- Description: Create training_datasets table for ML training data versioning (Gold Layer)

CREATE TABLE training_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic information
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Generation parameters
  generation_params JSONB NOT NULL,
  /*
    {
      "time_range": {
        "start": "2025-01-01T00:00:00Z",
        "end": "2026-01-04T00:00:00Z"
      },
      "geographic_scope": ["北京", "上海", "杭州"],
      "categories": ["restaurant", "attraction"],
      "min_quality_score": 0.7,
      "min_reviews": 10,
      "sampling": {
        "method": "stratified",
        "train_ratio": 0.8,
        "val_ratio": 0.1,
        "test_ratio": 0.1
      }
    }
  */
  
  -- Statistics
  statistics JSONB NOT NULL DEFAULT '{}',
  /*
    {
      "total_records": 50000,
      "train_size": 40000,
      "val_size": 5000,
      "test_size": 5000,
      "categories_distribution": {"restaurant": 20000, "attraction": 30000},
      "cities_distribution": {"北京": 15000, "上海": 20000, "杭州": 15000}
    }
  */
  
  -- Output
  output_format VARCHAR(20) NOT NULL DEFAULT 'json',  -- 'json', 'csv', 'parquet'
  output_path TEXT,  -- Storage path
  output_size_bytes BIGINT,
  
  -- Data provenance
  source_data_cutoff TIMESTAMPTZ NOT NULL,  -- Source data cutoff time
  poi_ids UUID[],  -- Included POI IDs (optional, can omit for large datasets)
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'generating', 'completed', 'failed'
  error_message TEXT,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(name, version)
);

-- Indexes for queries
CREATE INDEX idx_training_datasets_status ON training_datasets(status);
CREATE INDEX idx_training_datasets_created ON training_datasets(created_at DESC);
CREATE INDEX idx_training_datasets_name ON training_datasets(name);
