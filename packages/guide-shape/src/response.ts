import type { travelGuides } from '@pathfinding/database';
import type { TravelGuideResponseDto } from '@pathfinding/types';
import { aiDayNumber, arrayFromRecord, recordFromJson } from './ai-days';

type GuideRow = typeof travelGuides.$inferSelect;

function stringFromRecord(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}

function stringArrayFromRecord(record: Record<string, unknown>, keys: string[]): string[] | null {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      if (strings.length > 0) {
        return strings;
      }
    }
  }
  return null;
}

function dateString(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return null;
}

function numberFromGuide(guide: GuideRow, key: keyof GuideRow, fallback = 0): number {
  const value = guide[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

function destinationsFromGuide(value: GuideRow['destinations']): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((destination) => {
      if (typeof destination === 'string') {
        return destination;
      }
      if (destination && typeof destination === 'object' && typeof destination.name === 'string') {
        return destination.name;
      }
      return null;
    })
    .filter((destination): destination is string => Boolean(destination));
}

function geocodingMetricsFromRecord(record: Record<string, unknown>): TravelGuideResponseDto['geocoding_metrics'] {
  const value = record.geocodingMetrics ?? record.geocoding_metrics;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const metrics = value as Record<string, unknown>;
  const totalPois = metrics.total_pois;
  const averageConfidence = metrics.average_confidence;
  const lowConfidenceCount = metrics.low_confidence_count;
  if (
    typeof totalPois === 'number'
    && typeof averageConfidence === 'number'
    && typeof lowConfidenceCount === 'number'
  ) {
    return { total_pois: totalPois, average_confidence: averageConfidence, low_confidence_count: lowConfidenceCount };
  }
  return null;
}

function normalizeAiDays(value: unknown): TravelGuideResponseDto['ai_days'] {
  if (!Array.isArray(value)) {
    return null;
  }
  interface NormalizedAiDay {
    day_number: number;
    theme?: string;
    title?: string;
    pois: Array<Record<string, unknown>>;
  }
  const days = value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null;
      }
      const record = item as Record<string, unknown>;
      const dayNumber = aiDayNumber(record);
      if (dayNumber === null) {
        return null;
      }
      return {
        day_number: dayNumber,
        ...(typeof record.theme === 'string' ? { theme: record.theme } : {}),
        ...(typeof record.title === 'string' ? { title: record.title } : {}),
        pois: Array.isArray(record.pois) ? record.pois as Array<Record<string, unknown>> : [],
      };
    })
    .filter((day): day is NormalizedAiDay => day !== null);
  return days.length > 0 ? days : null;
}

/**
 * Convert a DB guide row to the iOS-compatible response format. The iOS BlogPost
 * model expects specific snake_case field names that differ from the DB schema.
 */
export function toResponseDto(guide: GuideRow): TravelGuideResponseDto {
  const enrichedData = recordFromJson(guide.enrichedData);
  const id = String(guide.id);
  const aiDays = normalizeAiDays(
    arrayFromRecord(enrichedData, ['aiDays', 'ai_days'])
    ?? (Array.isArray(guide.dayItineraries) ? guide.dayItineraries : null),
  );

  return {
    id,
    _id: id,
    title: guide.title,
    summary: stringFromRecord(enrichedData, ['summary', 'aiSummary', 'ai_summary']),
    source_platform: guide.platform,
    source_external_id: guide.externalId ?? null,
    source_url: guide.sourceUrl ?? null,
    author_name: guide.authorName,
    author_id: stringFromRecord(enrichedData, ['authorId', 'author_id']),
    content: guide.content ?? '',
    content_html: stringFromRecord(enrichedData, ['contentHtml', 'content_html']),
    content_markdown: stringFromRecord(enrichedData, ['contentMarkdown', 'content_markdown']),
    cover_image_url: guide.coverImageUrl,
    image_urls: stringArray(guide.imageUrls),
    quality_score: numberFromGuide(guide, 'qualityScore'),
    views_count: numberFromGuide(guide, 'viewCount'),
    likes_count: numberFromGuide(guide, 'likeCount'),
    saves_count: null,
    comments_count: numberFromGuide(guide, 'commentCount'),
    destinations: destinationsFromGuide(guide.destinations),
    tags: stringArray(guide.tags),
    published_at: dateString(guide.publishedAt),
    crawled_at: dateString(guide.crawledAt),
    created_at: dateString(guide.createdAt),
    updated_at: dateString(guide.updatedAt),
    ai_summary: stringFromRecord(enrichedData, ['aiSummary', 'summary', 'ai_summary']),
    ai_tips: stringArrayFromRecord(enrichedData, ['aiTips', 'tips', 'ai_tips']),
    ai_best_time: stringFromRecord(enrichedData, ['aiBestTime', 'bestTime', 'ai_best_time']),
    ai_duration: stringFromRecord(enrichedData, ['aiDuration', 'duration', 'ai_duration']),
    ai_budget: stringFromRecord(enrichedData, ['aiBudget', 'budget', 'ai_budget']),
    ai_days: aiDays,
    ai_processed_at: null,
    ai_version: stringFromRecord(enrichedData, ['aiVersion', 'version', 'ai_version']),
    ai_model: stringFromRecord(enrichedData, ['aiModel', 'model', 'ai_model']),
    geocoding_metrics: geocodingMetricsFromRecord(enrichedData),
  };
}
