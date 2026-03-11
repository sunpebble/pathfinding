/**
 * Crawler backend proxy — server-side only
 *
 * Deep module that hides HTTP transport, response parsing, and
 * data normalization behind two simple exports:
 *   fetchBackendApi<T>(endpoint, init?)  — typed fetch against the crawler backend
 *   normalizeTravelGuide(raw)            — snake_case / camelCase field normalizer
 *   normalizeCrawlJob(raw)               — same for crawl jobs
 */

import type { CrawlJob } from './crawler';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_BACKEND_API_URL = 'http://localhost:3001';

export function getBackendApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_API_URL;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function parseErrorMessage(error: unknown, status: number): string {
  if (error && typeof error === 'object') {
    const message = 'message' in error ? error.message : undefined;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }

    const fallback = 'error' in error ? error.error : undefined;
    if (typeof fallback === 'string' && fallback.length > 0) {
      return fallback;
    }
  }

  return `HTTP error ${status}`;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

function toStringOrUndefined(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function toNumberOrDefault(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch from the crawler backend (server-side).
 *
 * Adds JSON content-type, parses the response, and throws on non-2xx.
 */
export async function fetchBackendApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${getBackendApiBaseUrl()}${endpoint}`, {
    method: options?.method ?? 'GET',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await parseJsonResponse<unknown>(res).catch(() => undefined);
    throw new Error(parseErrorMessage(error, res.status));
  }

  return parseJsonResponse<T>(res);
}

/**
 * Normalize a raw travel-guide record from the crawler backend.
 *
 * Handles both snake_case and camelCase field names so callers
 * always get a consistent shape regardless of the backend version.
 */
export function normalizeTravelGuide(
  guide: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: toStringOrUndefined(guide.id) ?? toStringOrUndefined(guide._id) ?? '',
    _id: toStringOrUndefined(guide._id) ?? toStringOrUndefined(guide.id) ?? '',
    source_platform:
      toStringOrUndefined(guide.source_platform)
      ?? toStringOrUndefined(guide.sourcePlatform)
      ?? '',
    source_external_id:
      toStringOrUndefined(guide.source_external_id)
      ?? toStringOrUndefined(guide.sourceExternalId),
    source_url:
      toStringOrUndefined(guide.source_url)
      ?? toStringOrUndefined(guide.sourceUrl),
    title: toStringOrUndefined(guide.title) ?? 'Untitled guide',
    content: toStringOrUndefined(guide.content) ?? '',
    content_html:
      toStringOrUndefined(guide.content_html)
      ?? toStringOrUndefined(guide.contentHtml),
    content_markdown:
      toStringOrUndefined(guide.content_markdown)
      ?? toStringOrUndefined(guide.contentMarkdown),
    author_name:
      toStringOrUndefined(guide.author_name)
      ?? toStringOrUndefined(guide.authorName)
      ?? 'Anonymous user',
    author_id:
      toStringOrUndefined(guide.author_id)
      ?? toStringOrUndefined(guide.authorId),
    destinations: toStringArray(guide.destinations),
    tags: toStringArray(guide.tags),
    likes_count: toNumberOrDefault(guide.likes_count ?? guide.like_count),
    saves_count: toNumberOrDefault(guide.saves_count),
    comments_count: toNumberOrDefault(guide.comments_count ?? guide.comment_count),
    views_count: toNumberOrDefault(guide.views_count ?? guide.view_count),
    cover_image_url:
      toStringOrUndefined(guide.cover_image_url)
      ?? toStringOrUndefined(guide.coverImageUrl),
    image_urls: toStringArray(guide.image_urls ?? guide.imageUrls),
    published_at:
      toStringOrUndefined(guide.published_at)
      ?? toStringOrUndefined(guide.publishedAt),
    crawled_at:
      toStringOrUndefined(guide.crawled_at)
      ?? toStringOrUndefined(guide.crawledAt),
    quality_score: toNumberOrDefault(guide.quality_score),
    completeness_level:
      toStringOrUndefined(guide.completeness_level)
      ?? toStringOrUndefined(guide.completenessLevel),
    content_truncated: Boolean(guide.content_truncated ?? guide.contentTruncated),
    created_at:
      toStringOrUndefined(guide.created_at)
      ?? toStringOrUndefined(guide.createdAt),
    updated_at:
      toStringOrUndefined(guide.updated_at)
      ?? toStringOrUndefined(guide.updatedAt)
      ?? toStringOrUndefined(guide.created_at)
      ?? toStringOrUndefined(guide.createdAt),
    ai_summary:
      toStringOrUndefined(guide.ai_summary)
      ?? toStringOrUndefined(guide.aiSummary),
    ai_tips: Array.isArray(guide.ai_tips) ? guide.ai_tips : guide.aiTips,
    ai_best_time:
      toStringOrUndefined(guide.ai_best_time)
      ?? toStringOrUndefined(guide.aiBestTime),
    ai_duration:
      toStringOrUndefined(guide.ai_duration)
      ?? toStringOrUndefined(guide.aiDuration),
    ai_budget:
      toStringOrUndefined(guide.ai_budget)
      ?? toStringOrUndefined(guide.aiBudget),
    ai_days: Array.isArray(guide.ai_days) ? guide.ai_days : guide.aiDays,
    ai_processed_at:
      toStringOrUndefined(guide.ai_processed_at)
      ?? toStringOrUndefined(guide.aiProcessedAt),
    ai_version:
      toStringOrUndefined(guide.ai_version)
      ?? toStringOrUndefined(guide.aiVersion),
    ai_model:
      toStringOrUndefined(guide.ai_model)
      ?? toStringOrUndefined(guide.aiModel),
    geocoding_metrics: toRecord(guide.geocoding_metrics ?? guide.geocodingMetrics),
  };
}

/**
 * Normalize a raw crawl-job record from the crawler backend.
 */
export function normalizeCrawlJob(job: Record<string, unknown>): CrawlJob {
  const platform = toStringOrUndefined(job.platform) ?? 'unknown';
  const jobType
    = toStringOrUndefined(job.job_type)
      ?? toStringOrUndefined(job.jobType)
      ?? 'full';

  return {
    id: toStringOrUndefined(job.id) ?? '',
    name:
      toStringOrUndefined(job.name)
      ?? `${platform} ${jobType}`,
    platform,
    job_type: jobType,
    status: (toStringOrUndefined(job.status) ?? 'pending') as CrawlJob['status'],
    config: (toRecord(job.config) ?? {}) as CrawlJob['config'],
    statistics: (toRecord(job.statistics ?? job.progress) as CrawlJob['statistics']) ?? undefined,
    schedule_cron:
      toStringOrUndefined(job.schedule_cron)
      ?? toStringOrUndefined(job.scheduleCron),
    started_at:
      toStringOrUndefined(job.started_at)
      ?? toStringOrUndefined(job.startedAt),
    completed_at:
      toStringOrUndefined(job.completed_at)
      ?? toStringOrUndefined(job.completedAt),
    last_run_at:
      toStringOrUndefined(job.last_run_at)
      ?? toStringOrUndefined(job.lastRunAt),
    next_run_at:
      toStringOrUndefined(job.next_run_at)
      ?? toStringOrUndefined(job.nextRunAt),
    created_at:
      toStringOrUndefined(job.created_at)
      ?? toStringOrUndefined(job.createdAt)
      ?? new Date(0).toISOString(),
    updated_at:
      toStringOrUndefined(job.updated_at)
      ?? toStringOrUndefined(job.updatedAt)
      ?? toStringOrUndefined(job.created_at)
      ?? toStringOrUndefined(job.createdAt)
      ?? new Date(0).toISOString(),
  };
}
