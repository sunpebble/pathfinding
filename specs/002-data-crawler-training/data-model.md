# Data Model: Data Crawler & Training Dataset

**Branch**: `002-data-crawler-training` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)

## Overview

本文档定义了数据爬虫和训练数据集系统的完整数据模型，采用三层数据架构：

1. **Bronze Layer** (原始层): 存储原始爬取数据
2. **Silver Layer** (标准层): 存储清洗、标准化后的数据
3. **Gold Layer** (训练层): 存储 ML 训练就绪的数据集

## Entity Relationship Diagram

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   CrawlJob       │────▶│  RawCrawlRecord   │────▶│  NormalizedPOI   │
│                  │     │                   │     │                  │
│  - id            │     │  - id             │     │  - id            │
│  - platform      │     │  - job_id         │     │  - canonical_id  │
│  - config        │     │  - source_url     │     │  - name          │
│  - schedule      │     │  - raw_content    │     │  - location      │
│  - status        │     │  - parse_status   │     │  - ratings       │
└──────────────────┘     └───────────────────┘     └──────────────────┘
                                                          │
                                                          ▼
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│ DataQualityReport│◀────│ TrainingDataset   │◀────│   POIReview      │
│                  │     │                   │     │                  │
│  - id            │     │  - id             │     │  - id            │
│  - metrics       │     │  - version        │     │  - poi_id        │
│  - anomalies     │     │  - parameters     │     │  - text          │
│  - timestamp     │     │  - statistics     │     │  - rating        │
└──────────────────┘     └───────────────────┘     └──────────────────┘
```

## Bronze Layer: Raw Data

### Table: `crawl_jobs`

爬取任务配置和执行记录。

```sql
CREATE TABLE crawl_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,  -- 'amap', 'baidu', 'openstreetmap', etc.
  job_type VARCHAR(20) NOT NULL DEFAULT 'full',  -- 'full', 'incremental'
  
  -- 配置
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
  
  -- 调度
  schedule_cron VARCHAR(100),  -- cron 表达式, null 表示手动触发
  next_run_at TIMESTAMPTZ,
  
  -- 执行状态
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- 统计
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

CREATE INDEX idx_crawl_jobs_status ON crawl_jobs(status);
CREATE INDEX idx_crawl_jobs_platform ON crawl_jobs(platform);
CREATE INDEX idx_crawl_jobs_next_run ON crawl_jobs(next_run_at) WHERE status = 'pending';
```

### Table: `raw_crawl_records`

原始爬取记录，保留完整数据用于审计和重处理。

```sql
CREATE TABLE raw_crawl_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
  
  -- 源信息
  source_platform VARCHAR(50) NOT NULL,
  source_url TEXT NOT NULL,
  source_external_id VARCHAR(255),  -- 平台方 ID
  
  -- 原始内容
  raw_content TEXT NOT NULL,  -- 原始 HTML/JSON
  content_type VARCHAR(50) NOT NULL DEFAULT 'html',  -- 'html', 'json', 'xml'
  content_hash VARCHAR(64) NOT NULL,  -- SHA-256 用于增量检测
  content_size_bytes INTEGER NOT NULL,
  
  -- 爬取元数据
  http_status INTEGER,
  http_headers JSONB,
  crawler_version VARCHAR(20) NOT NULL,
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 解析状态
  parse_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'success', 'failed', 'skipped'
  parse_error TEXT,
  parsed_at TIMESTAMPTZ,
  
  -- 关联标准化记录
  normalized_poi_id UUID,  -- 关联到 normalized_pois (解析后填充)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_crawl_records_job ON raw_crawl_records(job_id);
CREATE INDEX idx_raw_crawl_records_platform ON raw_crawl_records(source_platform);
CREATE INDEX idx_raw_crawl_records_hash ON raw_crawl_records(content_hash);
CREATE INDEX idx_raw_crawl_records_parse_status ON raw_crawl_records(parse_status);
CREATE INDEX idx_raw_crawl_records_external_id ON raw_crawl_records(source_platform, source_external_id);

-- 分区策略: 按月分区 (大规模数据)
-- CREATE TABLE raw_crawl_records PARTITION BY RANGE (crawled_at);
```

## Silver Layer: Normalized Data

### Table: `normalized_pois`

标准化的 POI 数据，跨平台统一 schema。

```sql
CREATE TABLE normalized_pois (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id UUID,  -- 去重后的主记录 ID (自引用)
  
  -- 基本信息
  name VARCHAR(500) NOT NULL,
  name_en VARCHAR(500),
  name_aliases TEXT[],  -- 别名列表
  description TEXT,
  
  -- 分类
  category VARCHAR(100) NOT NULL,  -- 统一分类: 'restaurant', 'attraction', 'hotel', 'shopping', etc.
  subcategory VARCHAR(100),
  tags TEXT[],
  
  -- 位置
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  location_point GEOGRAPHY(POINT, 4326),  -- PostGIS 地理类型
  address TEXT,
  city VARCHAR(100),
  district VARCHAR(100),
  country VARCHAR(100) DEFAULT 'CN',
  postal_code VARCHAR(20),
  
  -- 评分
  rating_overall DECIMAL(3, 2),  -- 0.00 - 5.00
  rating_count INTEGER DEFAULT 0,
  rating_breakdown JSONB,  -- {"food": 4.5, "service": 4.2, "environment": 4.0}
  
  -- 营业信息
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
  
  -- 联系方式
  phone VARCHAR(50),
  website VARCHAR(500),
  
  -- 媒体
  photos_count INTEGER DEFAULT 0,
  photo_urls TEXT[],
  
  -- 数据质量
  quality_score DECIMAL(3, 2) DEFAULT 0.00,  -- 0.00 - 1.00
  completeness_score DECIMAL(3, 2) DEFAULT 0.00,
  freshness_score DECIMAL(3, 2) DEFAULT 0.00,
  
  -- 多源归因
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
  
  -- 去重信息
  is_duplicate BOOLEAN DEFAULT FALSE,
  merge_confidence DECIMAL(3, 2),
  
  -- 时间戳
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 空间索引
CREATE INDEX idx_normalized_pois_location ON normalized_pois USING GIST (location_point);

-- 查询索引
CREATE INDEX idx_normalized_pois_category ON normalized_pois(category);
CREATE INDEX idx_normalized_pois_city ON normalized_pois(city);
CREATE INDEX idx_normalized_pois_rating ON normalized_pois(rating_overall DESC NULLS LAST);
CREATE INDEX idx_normalized_pois_quality ON normalized_pois(quality_score DESC);
CREATE INDEX idx_normalized_pois_canonical ON normalized_pois(canonical_id) WHERE canonical_id IS NOT NULL;
CREATE INDEX idx_normalized_pois_duplicate ON normalized_pois(is_duplicate) WHERE is_duplicate = TRUE;

-- 全文搜索
CREATE INDEX idx_normalized_pois_name_search ON normalized_pois USING GIN (to_tsvector('simple', name));
```

### Table: `poi_reviews`

POI 评论数据。

```sql
CREATE TABLE poi_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id UUID NOT NULL REFERENCES normalized_pois(id) ON DELETE CASCADE,
  raw_record_id UUID REFERENCES raw_crawl_records(id),
  
  -- 评论内容
  content TEXT NOT NULL,
  content_language VARCHAR(10),  -- 'zh', 'en', etc.
  
  -- 评分
  rating DECIMAL(3, 2),  -- 0.00 - 5.00
  rating_breakdown JSONB,
  
  -- 作者信息 (脱敏)
  author_name VARCHAR(100),
  author_avatar_hash VARCHAR(64),  -- 头像 hash, 不存原始 URL
  author_level VARCHAR(50),
  
  -- 元数据
  published_at TIMESTAMPTZ,
  helpful_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  
  -- 情感分析 (可选)
  sentiment_score DECIMAL(3, 2),  -- -1.00 to 1.00
  sentiment_label VARCHAR(20),  -- 'positive', 'neutral', 'negative'
  
  -- 源信息
  source_platform VARCHAR(50) NOT NULL,
  source_external_id VARCHAR(255),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_poi_reviews_poi ON poi_reviews(poi_id);
CREATE INDEX idx_poi_reviews_rating ON poi_reviews(rating DESC NULLS LAST);
CREATE INDEX idx_poi_reviews_sentiment ON poi_reviews(sentiment_label);
CREATE INDEX idx_poi_reviews_published ON poi_reviews(published_at DESC);
```

### Table: `poi_source_mappings`

POI 跨平台 ID 映射关系。

```sql
CREATE TABLE poi_source_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id UUID NOT NULL REFERENCES normalized_pois(id) ON DELETE CASCADE,
  
  platform VARCHAR(50) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  external_url TEXT,
  
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.00,  -- 映射置信度
  match_method VARCHAR(50),  -- 'exact_id', 'name_location', 'manual'
  
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(platform, external_id)
);

CREATE INDEX idx_poi_source_mappings_poi ON poi_source_mappings(poi_id);
CREATE INDEX idx_poi_source_mappings_lookup ON poi_source_mappings(platform, external_id);
```

## Gold Layer: Training Data

### Table: `training_datasets`

训练数据集版本管理。

```sql
CREATE TABLE training_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本信息
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- 生成参数
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
  
  -- 统计信息
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
  
  -- 输出
  output_format VARCHAR(20) NOT NULL DEFAULT 'json',  -- 'json', 'csv', 'parquet'
  output_path TEXT,  -- 存储路径
  output_size_bytes BIGINT,
  
  -- 数据溯源
  source_data_cutoff TIMESTAMPTZ NOT NULL,  -- 源数据截止时间
  poi_ids UUID[],  -- 包含的 POI ID 列表 (可选, 大数据集可省略)
  
  -- 状态
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'generating', 'completed', 'failed'
  error_message TEXT,
  
  -- 时间戳
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(name, version)
);

CREATE INDEX idx_training_datasets_status ON training_datasets(status);
CREATE INDEX idx_training_datasets_created ON training_datasets(created_at DESC);
```

### Table: `data_quality_reports`

数据质量报告。

```sql
CREATE TABLE data_quality_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 关联
  report_type VARCHAR(50) NOT NULL,  -- 'daily', 'weekly', 'monthly', 'on_demand'
  scope_platform VARCHAR(50),  -- null 表示全平台
  scope_city VARCHAR(100),  -- null 表示全地区
  
  -- 时间范围
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- 指标
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
  
  -- 异常
  anomalies JSONB DEFAULT '[]',
  /*
    [
      {
        "type": "spike",
        "description": "异常高的爬取失败率",
        "severity": "high",
        "affected_platform": "platform_x",
        "details": {}
      }
    ]
  */
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_quality_reports_type ON data_quality_reports(report_type);
CREATE INDEX idx_data_quality_reports_period ON data_quality_reports(period_start, period_end);
CREATE INDEX idx_data_quality_reports_platform ON data_quality_reports(scope_platform);
```

## TypeScript Types

### 核心类型定义

```typescript
// packages/crawler-types/src/index.ts

// ============ Bronze Layer ============

export type CrawlJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type CrawlJobType = 'full' | 'incremental';
export type ParseStatus = 'pending' | 'success' | 'failed' | 'skipped';

export interface CrawlJobConfig {
  geographic_scope?: {
    cities?: string[];
    bounds?: {
      ne: [number, number];
      sw: [number, number];
    };
  };
  categories?: string[];
  rate_limit?: {
    requests_per_second: number;
    max_concurrent: number;
  };
  filters?: Record<string, unknown>;
}

export interface CrawlJobStatistics {
  requests_total: number;
  requests_success: number;
  requests_failed: number;
  records_extracted: number;
  bytes_downloaded: number;
  duration_seconds: number;
}

export interface CrawlJob {
  id: string;
  name: string;
  platform: string;
  job_type: CrawlJobType;
  config: CrawlJobConfig;
  schedule_cron?: string;
  next_run_at?: Date;
  status: CrawlJobStatus;
  started_at?: Date;
  completed_at?: Date;
  statistics: CrawlJobStatistics;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RawCrawlRecord {
  id: string;
  job_id: string;
  source_platform: string;
  source_url: string;
  source_external_id?: string;
  raw_content: string;
  content_type: 'html' | 'json' | 'xml';
  content_hash: string;
  content_size_bytes: number;
  http_status?: number;
  http_headers?: Record<string, string>;
  crawler_version: string;
  crawled_at: Date;
  parse_status: ParseStatus;
  parse_error?: string;
  parsed_at?: Date;
  normalized_poi_id?: string;
  created_at: Date;
}

// ============ Silver Layer ============

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  postal_code?: string;
}

export interface RatingInfo {
  overall?: number;
  count: number;
  breakdown?: Record<string, number>;
}

export interface OperatingHours {
  [day: string]: {
    open: string;
    close: string;
  } | { closed: true };
  exceptions?: Array<{
    date: string;
    closed?: boolean;
    hours?: { open: string; close: string };
  }>;
}

export interface SourceAttribution {
  platform: string;
  external_id: string;
  url?: string;
  confidence: number;
  last_crawled: Date;
}

export interface NormalizedPOI {
  id: string;
  canonical_id?: string;
  name: string;
  name_en?: string;
  name_aliases?: string[];
  description?: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  location: Location;
  ratings: RatingInfo;
  operating_hours?: OperatingHours;
  price_range?: string;
  price_avg?: number;
  phone?: string;
  website?: string;
  photos_count: number;
  photo_urls?: string[];
  quality_score: number;
  completeness_score: number;
  freshness_score: number;
  sources: SourceAttribution[];
  is_duplicate: boolean;
  merge_confidence?: number;
  first_seen_at: Date;
  last_updated_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface POIReview {
  id: string;
  poi_id: string;
  content: string;
  content_language?: string;
  rating?: number;
  rating_breakdown?: Record<string, number>;
  author_name?: string;
  author_level?: string;
  published_at?: Date;
  helpful_count: number;
  reply_count: number;
  sentiment_score?: number;
  sentiment_label?: 'positive' | 'neutral' | 'negative';
  source_platform: string;
  source_external_id?: string;
  created_at: Date;
}

// ============ Gold Layer ============

export interface TrainingDatasetParams {
  time_range?: {
    start: Date;
    end: Date;
  };
  geographic_scope?: string[];
  categories?: string[];
  min_quality_score?: number;
  min_reviews?: number;
  sampling?: {
    method: 'random' | 'stratified';
    train_ratio: number;
    val_ratio: number;
    test_ratio: number;
  };
}

export interface TrainingDatasetStats {
  total_records: number;
  train_size: number;
  val_size: number;
  test_size: number;
  categories_distribution: Record<string, number>;
  cities_distribution: Record<string, number>;
}

export type TrainingDatasetStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type OutputFormat = 'json' | 'csv' | 'parquet';

export interface TrainingDataset {
  id: string;
  name: string;
  version: string;
  description?: string;
  generation_params: TrainingDatasetParams;
  statistics: TrainingDatasetStats;
  output_format: OutputFormat;
  output_path?: string;
  output_size_bytes?: number;
  source_data_cutoff: Date;
  status: TrainingDatasetStatus;
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

// ============ Quality Reports ============

export interface QualityMetrics {
  completeness: {
    total_pois: number;
    with_description: number;
    with_photos: number;
    with_ratings: number;
    with_hours: number;
    completeness_rate: number;
  };
  freshness: {
    updated_last_24h: number;
    updated_last_7d: number;
    stale_30d: number;
    freshness_rate: number;
  };
  accuracy: {
    duplicates_found: number;
    duplicates_merged: number;
    conflicts_resolved: number;
    accuracy_rate: number;
  };
  coverage: {
    cities_covered: number;
    categories_covered: number;
    avg_pois_per_city: number;
  };
}

export interface QualityAnomaly {
  type: 'spike' | 'drop' | 'error' | 'warning';
  description: string;
  severity: 'low' | 'medium' | 'high';
  affected_platform?: string;
  details?: Record<string, unknown>;
}

export interface DataQualityReport {
  id: string;
  report_type: 'daily' | 'weekly' | 'monthly' | 'on_demand';
  scope_platform?: string;
  scope_city?: string;
  period_start: Date;
  period_end: Date;
  metrics: QualityMetrics;
  anomalies: QualityAnomaly[];
  created_at: Date;
}
```

## Category Taxonomy

统一分类体系，映射各平台分类到标准分类：

```typescript
// packages/constants/src/poi-categories.ts

export const POI_CATEGORIES = {
  // 餐饮
  restaurant: {
    name_zh: '餐厅',
    subcategories: ['chinese', 'western', 'japanese', 'korean', 'fastfood', 'cafe', 'bar']
  },
  
  // 景点
  attraction: {
    name_zh: '景点',
    subcategories: ['natural', 'historical', 'museum', 'park', 'theme_park', 'religious']
  },
  
  // 住宿
  hotel: {
    name_zh: '住宿',
    subcategories: ['luxury', 'business', 'budget', 'hostel', 'apartment', 'resort']
  },
  
  // 购物
  shopping: {
    name_zh: '购物',
    subcategories: ['mall', 'market', 'specialty', 'convenience', 'supermarket']
  },
  
  // 交通
  transport: {
    name_zh: '交通',
    subcategories: ['airport', 'train_station', 'bus_station', 'subway', 'port']
  },
  
  // 娱乐
  entertainment: {
    name_zh: '娱乐',
    subcategories: ['cinema', 'ktv', 'spa', 'gym', 'nightclub', 'arcade']
  },
  
  // 服务
  service: {
    name_zh: '服务',
    subcategories: ['bank', 'hospital', 'pharmacy', 'post_office', 'police']
  }
} as const;

export type POICategory = keyof typeof POI_CATEGORIES;
```

## Data Quality Scoring

质量评分算法：

```typescript
// apps/crawler/src/processors/quality-scorer.ts

export function calculateQualityScore(poi: Partial<NormalizedPOI>): number {
  const weights = {
    hasName: 0.15,
    hasDescription: 0.10,
    hasLocation: 0.15,
    hasCategory: 0.10,
    hasRating: 0.10,
    hasPhotos: 0.10,
    hasOperatingHours: 0.05,
    hasPhone: 0.05,
    multiSource: 0.10,
    recentUpdate: 0.10
  };
  
  let score = 0;
  
  if (poi.name) score += weights.hasName;
  if (poi.description && poi.description.length > 50) score += weights.hasDescription;
  if (poi.location?.latitude && poi.location?.longitude) score += weights.hasLocation;
  if (poi.category) score += weights.hasCategory;
  if (poi.ratings?.count && poi.ratings.count > 0) score += weights.hasRating;
  if (poi.photos_count && poi.photos_count > 0) score += weights.hasPhotos;
  if (poi.operating_hours) score += weights.hasOperatingHours;
  if (poi.phone) score += weights.hasPhone;
  if (poi.sources && poi.sources.length > 1) score += weights.multiSource;
  
  // Freshness: updated in last 30 days
  if (poi.last_updated_at) {
    const daysSinceUpdate = (Date.now() - new Date(poi.last_updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) score += weights.recentUpdate;
  }
  
  return Math.round(score * 100) / 100;
}
```

## Migration Files

新增的数据库迁移文件：

| 文件 | 描述 |
|-----|------|
| `009_create_crawl_jobs.sql` | 爬取任务表 |
| `010_create_raw_crawl_records.sql` | 原始爬取记录表 |
| `011_create_normalized_pois.sql` | 标准化 POI 表 |
| `012_create_poi_reviews.sql` | POI 评论表 |
| `013_create_poi_source_mappings.sql` | POI 源映射表 |
| `014_create_training_datasets.sql` | 训练数据集表 |
| `015_create_data_quality_reports.sql` | 数据质量报告表 |
