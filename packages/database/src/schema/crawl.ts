/**
 * Crawl schema - crawl jobs, raw records, training datasets, quality reports, blog posts.
 */
import { index, int, json, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── Crawl Jobs ─────────────────────────────────────────
export const crawlJobs = mysqlTable(
  'crawl_jobs',
  {
    id: id(),
    platform: varchar('platform', { length: 50 }).notNull(),
    jobType: varchar('job_type', { length: 30 }),
    config: json('config'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    progress: json('progress'),
    startedAt: timestamp('started_at', { mode: 'date' }),
    completedAt: timestamp('completed_at', { mode: 'date' }),
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
export const rawCrawlRecords = mysqlTable(
  'raw_crawl_records',
  {
    id: id(),
    jobId: fk('job_id').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    url: text('url'),
    rawData: json('raw_data'),
    processedData: json('processed_data'),
    /** SHA-256 hex digest of the raw payload, for dedup / replay (crawler-types RawCrawlRecord.content_hash) */
    contentHash: varchar('content_hash', { length: 64 }),
    /** Parse pipeline status (crawler-types ParseStatus): pending | success | failed | skipped | rejected */
    parseStatus: varchar('parse_status', { length: 20 }).notNull().default('pending'),
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
export const trainingDatasets = mysqlTable(
  'training_datasets',
  {
    id: id(),
    name: varchar('name', { length: 255 }).notNull(),
    version: int('version').notNull().default(1),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    recordCount: int('record_count').notNull().default(0),
    config: json('config'),
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
export const dataQualityReports = mysqlTable(
  'data_quality_reports',
  {
    id: id(),
    datasetId: fk('dataset_id').notNull(),
    reportType: varchar('report_type', { length: 30 }),
    metrics: json('metrics'),
    issues: json('issues'),
    generatedAt: timestamp('generated_at', { mode: 'date' }),
    createdAt: createdAt(),
  },
  t => [
    index('quality_reports_dataset_idx').on(t.datasetId),
  ],
);

// ── Travel Blog Posts ──────────────────────────────────
export const travelBlogPosts = mysqlTable(
  'travel_blog_posts',
  {
    id: id(),
    platform: varchar('platform', { length: 50 }).notNull(),
    externalId: varchar('external_id', { length: 255 }),
    title: varchar('title', { length: 500 }),
    url: text('url'),
    content: text('content'),
    authorName: varchar('author_name', { length: 255 }),
    crawledAt: timestamp('crawled_at', { mode: 'date' }),
    createdAt: createdAt(),
  },
  t => [
    index('blog_posts_platform_idx').on(t.platform),
    index('blog_posts_platform_ext_idx').on(t.platform, t.externalId),
  ],
);
