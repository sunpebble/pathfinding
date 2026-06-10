/**
 * Crawler backend proxy — server-side only.
 *
 * Deep module that hides HTTP transport, response parsing, and
 * data normalization behind simple exports:
 *
 * - {@link fetchBackendApi} — typed fetch against the crawler backend
 * - {@link normalizeTravelGuide} — snake_case / camelCase field normalizer
 * - {@link normalizeCrawlJob} — same for crawl jobs
 *
 * @module
 */

import type { CrawlJob } from './crawler';
import { getMockResponse } from './mock-data';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Default backend URL when `NEXT_PUBLIC_API_URL` is not set. */
const DEFAULT_BACKEND_API_URL = 'http://localhost:3001';

/** Resolve the crawler backend base URL from the environment. */
export function getBackendApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_API_URL;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

export class BackendApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
    this.data = data;
  }
}

/** Extract a human-readable error message from a parsed error response. */
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

/** Safely parse a JSON response body, returning `undefined` for empty bodies. */
async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/** Convert a value to a string if non-empty, or `undefined`. */
function toStringOrUndefined(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

/** Convert a value to a number, falling back to a default. */
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

/**
 * Convert a value to a number, preserving "no data" as `null`.
 *
 * Used for stats the backend explicitly nulls out (e.g. `saves_count`,
 * D13) — coercing them to 0 would fake a real measurement.
 */
function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

/** Filter an unknown value to an array of strings. */
function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

/** Narrow an unknown value to a plain object, or return `undefined`. */
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
  try {
    const res = await fetch(`${getBackendApiBaseUrl()}${endpoint}`, {
      method: options?.method ?? 'GET',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const error = await parseJsonResponse<unknown>(res).catch(() => undefined);
      throw new BackendApiError(parseErrorMessage(error, res.status), res.status, error);
    }

    return parseJsonResponse<T>(res);
  }
  catch (error) {
    if (error instanceof BackendApiError) {
      throw error;
    }

    // In production, never fall back to mock data — re-throw immediately
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }

    // Fall back to mock data only in development when the backend is unreachable
    const method = options?.method ?? 'GET';
    const mock = getMockResponse(endpoint, method);
    if (mock) {
      console.warn(`[mock] Backend unavailable, returning mock data for ${method} ${endpoint}`);
      return mock as T;
    }
    throw new Error(`Backend unavailable and no mock data for ${method} ${endpoint}`);
  }
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
    saves_count: toNumberOrNull(guide.saves_count),
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
