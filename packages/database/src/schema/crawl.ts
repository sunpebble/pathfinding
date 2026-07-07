/**
 * Crawl schema - crawl jobs, raw records, training datasets, quality reports, blog posts.
 */
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── Crawl Jobs ─────────────────────────────────────────
export const crawlJobs = sqliteTable(
  'crawl_jobs',
  {
    id: id(),
    platform: text('platform').notNull(),
    jobType: text('job_type'),
    config: text('config', { mode: 'json' }),
    status: text('status').notNull().default('pending'),
    progress: text('progress', { mode: 'json' }),
    startedAt: integer('started_at', { mode: 'timestamp' }),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    error: text('error'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('crawl_jobs_status_idx').on(t.status),
    index('crawl_jobs_platform_idx').on(t.platform),
  ],
);

// ── Raw Crawl Records ──────────────────────────────────
export const rawCrawlRecords = sqliteTable(
  'raw_crawl_records',
  {
    id: id(),
    jobId: fk('job_id').notNull(),
    status: text('status').notNull().default('pending'),
    url: text('url'),
    rawData: text('raw_data', { mode: 'json' }),
    processedData: text('processed_data', { mode: 'json' }),
    /** SHA-256 hex digest of the raw payload, for dedup / replay (crawler-types RawCrawlRecord.content_hash) */
    contentHash: text('content_hash'),
    /** Parse pipeline status (crawler-types ParseStatus): pending | success | failed | skipped | rejected */
    parseStatus: text('parse_status').notNull().default('pending'),
    error: text('error'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('raw_crawl_job_idx').on(t.jobId),
    index('raw_crawl_job_status_idx').on(t.jobId, t.status),
    index('raw_crawl_status_idx').on(t.status),
    index('raw_crawl_content_hash_idx').on(t.contentHash),
    index('raw_crawl_parse_status_idx').on(t.parseStatus),
  ],
);

// ── Training Datasets ──────────────────────────────────
export const trainingDatasets = sqliteTable(
  'training_datasets',
  {
    id: id(),
    name: text('name').notNull(),
    version: integer('version').notNull().default(1),
    description: text('description'),
    status: text('status').notNull().default('draft'),
    recordCount: integer('record_count').notNull().default(0),
    config: text('config', { mode: 'json' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('datasets_name_idx').on(t.name),
    index('datasets_version_idx').on(t.version),
    index('datasets_status_idx').on(t.status),
  ],
);

// ── Data Quality Reports ───────────────────────────────
export const dataQualityReports = sqliteTable(
  'data_quality_reports',
  {
    id: id(),
    datasetId: fk('dataset_id').notNull(),
    reportType: text('report_type'),
    metrics: text('metrics', { mode: 'json' }),
    issues: text('issues', { mode: 'json' }),
    generatedAt: integer('generated_at', { mode: 'timestamp' }),
    createdAt: createdAt(),
  },
  t => [
    index('quality_reports_dataset_idx').on(t.datasetId),
  ],
);

// ── Travel Blog Posts ──────────────────────────────────
export const travelBlogPosts = sqliteTable(
  'travel_blog_posts',
  {
    id: id(),
    platform: text('platform').notNull(),
    externalId: text('external_id'),
    title: text('title'),
    url: text('url'),
    content: text('content'),
    authorName: text('author_name'),
    crawledAt: integer('crawled_at', { mode: 'timestamp' }),
    createdAt: createdAt(),
  },
  t => [
    index('blog_posts_platform_idx').on(t.platform),
    index('blog_posts_platform_ext_idx').on(t.platform, t.externalId),
  ],
);
