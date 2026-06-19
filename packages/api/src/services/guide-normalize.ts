import type { CompletenessLevel } from '@pathfinding/crawler-types';
import type { GuideDestination, travelGuides } from '@pathfinding/database';
import type { RawCrawlDetail } from './go-crawler-port.js';
import { createHash } from 'node:crypto';
import {
  calculateCompletenessLevel,
  calculateQualityScoreUnified,
  cleanContent,
  MIN_CONTENT_LENGTH,
  parseChineseNumber,
  validateGuideEnhanced,
} from '@pathfinding/crawler-types';
import { buildStructuredGuideContent } from './guide-content.js';

const UNTITLED = '未命名';
const NO_JOB_ID = 0;
const CHINESE_DATE_PATTERN = /(\d{4})[年.\-/](\d{1,2})[月.\-/](\d{1,2})/;

export type GuideWriteValues = Partial<typeof travelGuides.$inferInsert>;

export interface ImportContext {
  city?: string;
  cityScoped?: boolean;
  jobId?: number;
}

export interface StagingSupplement {
  destinationName?: string | null;
  tags?: unknown;
  // mafengwoGuides.commentsCount/savesCount are int notNull default 0 → number (matches $inferSelect).
  commentsCount?: number;
  savesCount?: number;
  publishedAt?: Date | null;
}

export interface RawCrawlAudit {
  jobId: number;
  rawData: Record<string, unknown>;
  contentHash: string;
}

export interface CanonicalGuide {
  platform: string;
  externalId?: string;
  values: GuideWriteValues;
  destinationNames: string[];
  views: number | null;
  likes: number | null;
  commentCount: number | null;
  cleanedContent: string;
  enrichedNew: Record<string, unknown>;
}

export type NormalizeResult
  = | { status: 'accepted'; guide: CanonicalGuide; warnings: string[]; audit: RawCrawlAudit }
    | { status: 'rejected'; reason: string; warnings: string[]; audit: RawCrawlAudit };

function sha256Hex(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

function resolveCount(field: string, parsed: unknown, raw: string | undefined, warnings: string[]): number | null {
  if (typeof parsed === 'number' && Number.isFinite(parsed)) {
    return parsed;
  }
  const candidates = [typeof parsed === 'string' ? parsed : undefined, raw];
  for (const candidate of candidates) {
    if (candidate && candidate.trim() !== '') {
      const value = parseChineseNumber(candidate);
      if (value !== null) {
        return value;
      }
    }
  }
  warnings.push(
    `${field} 计数解析失败（parsed=${JSON.stringify(parsed ?? null)}, raw=${JSON.stringify(raw ?? null)}）：新建置 0，更新保留原值`,
  );
  return null;
}

function parsePublishedAt(raw: string | undefined, warnings: string[]): Date | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }
  const match = CHINESE_DATE_PATTERN.exec(trimmed);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }
  warnings.push(`publishedAt 解析失败：${trimmed}`);
  return null;
}

function resolveDestinationNames(context: ImportContext | undefined, stagingDestination: string | null | undefined): string[] {
  const names = new Set<string>();
  if (context?.cityScoped === true && context.city?.trim()) {
    names.add(context.city.trim());
  }
  if (stagingDestination?.trim()) {
    names.add(stagingDestination.trim());
  }
  return [...names];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * Pure raw -> CanonicalGuide. `requestUrl` is the URL we asked Go to crawl (audit/dedup identity);
 *  inject `clock` for deterministic crawledAt/lastUpdatedAt.
 */
export function normalizeGuide(
  detail: RawCrawlDetail,
  requestUrl: string,
  context: ImportContext | undefined,
  staging: StagingSupplement | null,
  clock: () => Date = () => new Date(),
): NormalizeResult {
  const jobId = context?.jobId ?? NO_JOB_ID;
  const rawData: Record<string, unknown> = { platform: 'mafengwo', requestUrl, response: detail };
  const audit: RawCrawlAudit = { jobId, rawData, contentHash: sha256Hex(JSON.stringify(rawData)) };
  const warnings: string[] = [];

  if (detail.saveError) {
    warnings.push(`Go 暂存层保存失败：${detail.saveError}`);
  }

  const cleaning = cleanContent(detail.content ?? '');
  const cleanedContent = cleaning.content;
  const meaningfulRemovals = cleaning.removedTypes.filter(type => type !== 'whitespace');
  if (meaningfulRemovals.length > 0) {
    warnings.push(`清洗移除类目：${meaningfulRemovals.join(', ')}（${cleaning.originalLength}→${cleaning.cleanedLength} 字符）`);
  }

  const externalId = detail.externalId?.trim() || undefined;
  const destinationNames = resolveDestinationNames(context, staging?.destinationName);
  const tags = asStringArray(staging?.tags);
  const views = resolveCount('views', detail.views, detail.viewsRaw, warnings);
  const likes = resolveCount('likes', detail.likes, detail.likesRaw, warnings);
  const commentCount = staging?.commentsCount ?? null;
  const savesCount = staging?.savesCount ?? undefined;
  const publishedAt = staging?.publishedAt ?? parsePublishedAt(detail.publishedAt, warnings);

  // Pre-validation: reject on content length before hitting the full validator.
  // This keeps destinations from being the silent rejection cause when content is clearly bad.
  if (cleanedContent.length < MIN_CONTENT_LENGTH) {
    return {
      status: 'rejected',
      reason: `内容过短（${cleanedContent.length} 字符，最低 ${MIN_CONTENT_LENGTH}）`,
      warnings,
      audit,
    };
  }

  const validation = validateGuideEnhanced({
    sourcePlatform: 'mafengwo',
    sourceExternalId: externalId,
    content: cleanedContent,
    destinations: destinationNames,
    title: detail.title,
    coverImageUrl: detail.coverImage,
    imageUrls: detail.images,
    authorName: detail.author,
    viewsCount: views ?? undefined,
    likesCount: likes ?? undefined,
    commentsCount: commentCount ?? undefined,
    savesCount,
  });

  // Destinations errors are demoted to warnings in the normalizer: the caller
  // (guide-writer) decides whether to reject for missing destinations. All other
  // error-level issues (missing platform, externalId, content) remain hard rejections.
  const hardErrors = validation.errors.filter(e => e.field !== 'destinations');
  if (hardErrors.length > 0) {
    const reasons = hardErrors.map(issue => `${issue.field}: ${issue.message}`).join('; ');
    return { status: 'rejected', reason: `error 级校验拒绝：${reasons}`, warnings, audit };
  }
  const destinationErrors = validation.errors.filter(e => e.field === 'destinations');
  for (const err of destinationErrors) {
    warnings.push(`destinations: ${err.message}`);
  }

  for (const warning of validation.warnings) {
    warnings.push(`${warning.field}: ${warning.message}`);
  }

  const quality = calculateQualityScoreUnified({
    title: validation.normalizedData.title,
    content: cleanedContent,
    authorName: validation.normalizedData.authorName,
    images: validation.normalizedData.imageUrls,
    coverImage: validation.normalizedData.coverImageUrl,
    views: views ?? undefined,
    likes: likes ?? undefined,
    saves: savesCount,
    comments: commentCount ?? undefined,
    destinations: destinationNames,
    tags,
  });

  const contentTruncated = detail.contentTruncated === true || validation.normalizedData.contentTruncated === true;
  const completenessLevel: CompletenessLevel = calculateCompletenessLevel({
    title: validation.normalizedData.title,
    content: cleanedContent,
    coverImageUrl: validation.normalizedData.coverImageUrl,
    imageUrls: validation.normalizedData.imageUrls,
    authorName: validation.normalizedData.authorName,
    destinations: destinationNames,
    contentTruncated,
    viewsCount: views ?? undefined,
    likesCount: likes ?? undefined,
    commentsCount: commentCount ?? undefined,
    savesCount,
    qualityScore: quality.score,
  });

  const enrichedNew: Record<string, unknown> = {
    ...buildStructuredGuideContent({
      title: detail.title,
      content: cleanedContent,
      contentHtml: detail.contentHtml,
      contentMarkdown: detail.contentMarkdown,
      imageUrls: validation.normalizedData.imageUrls,
    }),
    ingestWarnings: warnings,
  };

  const guide: CanonicalGuide = {
    platform: 'mafengwo',
    externalId,
    values: {
      title: validation.normalizedData.title ?? UNTITLED,
      content: cleanedContent,
      authorName: validation.normalizedData.authorName ?? null,
      sourceUrl: requestUrl,
      coverImageUrl: validation.normalizedData.coverImageUrl ?? null,
      imageUrls: validation.normalizedData.imageUrls ?? [],
      destinations: destinationNames.map(name => ({ name })) as GuideDestination[],
      tags,
      publishedAt,
      viewCount: views ?? 0,
      likeCount: likes ?? 0,
      commentCount: commentCount ?? 0,
      qualityScore: quality.score,
      completenessLevel,
      crawledAt: clock(),
      lastUpdatedAt: clock(),
    },
    destinationNames,
    views,
    likes,
    commentCount,
    cleanedContent,
    enrichedNew,
  };

  return { status: 'accepted', guide, warnings, audit };
}
