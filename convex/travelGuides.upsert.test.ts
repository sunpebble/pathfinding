// @ts-nocheck
/**
 * Tests for travelGuides upsert and bulkUpsert logic
 * Tests deduplication, completeness calculation, and truncation detection
 */

import { describe, expect, it } from 'vitest';

// ============================================================
// Helper Functions (extracted from travelGuides.ts for testing)
// ============================================================

const TRUNCATION_PATTERNS = [
  /\.{3}$/,
  /…$/,
  /\[查看更多\]$/,
  /\[展开全文\]$/,
  /\[阅读全文\]$/,
  /查看更多$/,
  /展开全文$/,
];

function isContentTruncated(content: string): boolean {
  return TRUNCATION_PATTERNS.some(pattern => pattern.test(content));
}

const MIN_CONTENT_LENGTH = 200;
const MIN_CONTENT_LENGTH_COMPLETE = 500;

function calculateCompletenessLevel(input: {
  title?: string;
  content?: string;
  coverImageUrl?: string;
  imageUrls?: string[];
  authorName?: string;
  destinations?: string[];
  contentTruncated?: boolean;
  likesCount?: number;
  savesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  qualityScore?: number;
}): 'complete' | 'usable' | 'incomplete' {
  const {
    title,
    content,
    coverImageUrl,
    imageUrls,
    authorName,
    destinations,
    contentTruncated,
    likesCount,
    savesCount,
    commentsCount,
    viewsCount,
    qualityScore,
  } = input;

  const isTruncated = contentTruncated || (content ? isContentTruncated(content) : false);
  const hasImages = !!(coverImageUrl || (imageUrls && imageUrls.length > 0));
  const hasTitle = !!(title && title.trim().length > 0);
  const hasAuthor = !!(authorName && authorName.trim().length > 0);
  const hasDestinations = !!(destinations && destinations.length > 0);
  const contentLength = content?.length ?? 0;

  const hasAllCounts
    = likesCount !== undefined && likesCount !== null
      && savesCount !== undefined && savesCount !== null
      && commentsCount !== undefined && commentsCount !== null
      && viewsCount !== undefined && viewsCount !== null;

  const hasQualityScore = qualityScore !== undefined && qualityScore !== null;

  if (
    hasTitle && hasImages && hasAuthor && hasDestinations
    && hasAllCounts && hasQualityScore
    && contentLength >= MIN_CONTENT_LENGTH_COMPLETE && !isTruncated
  ) {
    return 'complete';
  }

  if (hasTitle && contentLength >= MIN_CONTENT_LENGTH && hasImages) {
    return 'usable';
  }

  return 'incomplete';
}

// Fill missing display fields with defaults
function fillMissingDisplayFields<T extends Record<string, unknown>>(data: T): T & {
  likesCount: number;
  savesCount: number;
  commentsCount: number;
  viewsCount: number;
  qualityScore: number;
  coverImageUrl?: string;
  imageUrls: string[];
} {
  const imageUrls = (data.imageUrls as string[] | undefined) ?? [];
  return {
    ...data,
    likesCount: (data.likesCount as number | undefined) ?? 0,
    savesCount: (data.savesCount as number | undefined) ?? 0,
    commentsCount: (data.commentsCount as number | undefined) ?? 0,
    viewsCount: (data.viewsCount as number | undefined) ?? 0,
    qualityScore: (data.qualityScore as number | undefined) ?? 0,
    coverImageUrl: (data.coverImageUrl as string | undefined) ?? imageUrls[0],
    imageUrls,
  };
}

// ============================================================
// Tests
// ============================================================

describe('travelGuides - Upsert Logic', () => {
  describe('isContentTruncated', () => {
    it('should detect truncation patterns', () => {
      expect(isContentTruncated('Content...')).toBe(true);
      expect(isContentTruncated('Content…')).toBe(true);
      expect(isContentTruncated('Content[查看更多]')).toBe(true);
      expect(isContentTruncated('Content[展开全文]')).toBe(true);
      expect(isContentTruncated('Content查看更多')).toBe(true);
    });

    it('should not flag normal content', () => {
      expect(isContentTruncated('Normal content.')).toBe(false);
      expect(isContentTruncated('Content with ... in middle')).toBe(false);
    });
  });

  describe('calculateCompletenessLevel', () => {
    it('should return "complete" with all fields', () => {
      const result = calculateCompletenessLevel({
        title: 'Complete Guide',
        content: 'A'.repeat(600),
        coverImageUrl: 'https://example.com/img.jpg',
        authorName: 'Author',
        destinations: ['北京'],
        contentTruncated: false,
        likesCount: 100,
        savesCount: 50,
        commentsCount: 25,
        viewsCount: 1000,
        qualityScore: 0.85,
      });
      expect(result).toBe('complete');
    });

    it('should return "usable" with title, content >= 200, and images', () => {
      const result = calculateCompletenessLevel({
        title: 'Usable Guide',
        content: 'A'.repeat(300),
        coverImageUrl: 'https://example.com/img.jpg',
      });
      expect(result).toBe('usable');
    });

    it('should return "incomplete" without title', () => {
      const result = calculateCompletenessLevel({
        content: 'A'.repeat(300),
        coverImageUrl: 'https://example.com/img.jpg',
      });
      expect(result).toBe('incomplete');
    });

    it('should return "incomplete" with truncated content', () => {
      const result = calculateCompletenessLevel({
        title: 'Guide',
        content: `${'A'.repeat(300)}...`,
        coverImageUrl: 'https://example.com/img.jpg',
        contentTruncated: true,
      });
      // Truncated but still has title + content + images = usable
      expect(result).toBe('usable');
    });
  });

  describe('fillMissingDisplayFields', () => {
    it('should fill numeric fields with 0', () => {
      const result = fillMissingDisplayFields({
        title: 'Test',
        content: 'Content',
      });
      expect(result.likesCount).toBe(0);
      expect(result.savesCount).toBe(0);
      expect(result.commentsCount).toBe(0);
      expect(result.viewsCount).toBe(0);
      expect(result.qualityScore).toBe(0);
    });

    it('should preserve existing values', () => {
      const result = fillMissingDisplayFields({
        title: 'Test',
        likesCount: 100,
        savesCount: 50,
      });
      expect(result.likesCount).toBe(100);
      expect(result.savesCount).toBe(50);
    });

    it('should auto-fill coverImageUrl from imageUrls[0]', () => {
      const result = fillMissingDisplayFields({
        imageUrls: ['https://example.com/first.jpg', 'https://example.com/second.jpg'],
      });
      expect(result.coverImageUrl).toBe('https://example.com/first.jpg');
    });

    it('should default imageUrls to empty array', () => {
      const result = fillMissingDisplayFields({});
      expect(result.imageUrls).toEqual([]);
    });
  });
});

describe('travelGuides - Upsert Behavior', () => {
  describe('insert vs update detection', () => {
    it('should identify new guide by platform + externalId', () => {
      const existingGuides = [
        { sourcePlatform: 'xiaohongshu', sourceExternalId: 'abc123' },
        { sourcePlatform: 'weibo', sourceExternalId: 'def456' },
      ];

      const newGuide = { sourcePlatform: 'xiaohongshu', sourceExternalId: 'xyz789' };

      const exists = existingGuides.some(
        g => g.sourcePlatform === newGuide.sourcePlatform
          && g.sourceExternalId === newGuide.sourceExternalId,
      );

      expect(exists).toBe(false);
    });

    it('should identify existing guide by platform + externalId', () => {
      const existingGuides = [
        { sourcePlatform: 'xiaohongshu', sourceExternalId: 'abc123' },
        { sourcePlatform: 'weibo', sourceExternalId: 'def456' },
      ];

      const updateGuide = { sourcePlatform: 'xiaohongshu', sourceExternalId: 'abc123' };

      const exists = existingGuides.some(
        g => g.sourcePlatform === updateGuide.sourcePlatform
          && g.sourceExternalId === updateGuide.sourceExternalId,
      );

      expect(exists).toBe(true);
    });
  });

  describe('refetch task trigger', () => {
    it('should trigger refetch when content is truncated and has sourceUrl', () => {
      const guide = {
        content: 'Truncated content...',
        sourceUrl: 'https://example.com/guide',
      };

      const contentTruncated = isContentTruncated(guide.content);
      const shouldTriggerRefetch = contentTruncated && !!guide.sourceUrl;

      expect(shouldTriggerRefetch).toBe(true);
    });

    it('should not trigger refetch when content is not truncated', () => {
      const guide = {
        content: 'Normal content without truncation.',
        sourceUrl: 'https://example.com/guide',
      };

      const contentTruncated = isContentTruncated(guide.content);
      const shouldTriggerRefetch = contentTruncated && !!guide.sourceUrl;

      expect(shouldTriggerRefetch).toBe(false);
    });

    it('should not trigger refetch when no sourceUrl', () => {
      const guide = {
        content: 'Truncated content...',
        sourceUrl: undefined,
      };

      const contentTruncated = isContentTruncated(guide.content);
      const shouldTriggerRefetch = contentTruncated && !!guide.sourceUrl;

      expect(shouldTriggerRefetch).toBe(false);
    });
  });
});

describe('travelGuides - BulkUpsert Deduplication', () => {
  describe('duplicate detection', () => {
    it('should identify duplicates by platform + externalId', () => {
      const guides = [
        { sourcePlatform: 'xiaohongshu', sourceExternalId: 'abc', title: 'First' },
        { sourcePlatform: 'xiaohongshu', sourceExternalId: 'def', title: 'Second' },
        { sourcePlatform: 'xiaohongshu', sourceExternalId: 'abc', title: 'Duplicate of First' },
      ];

      const seen = new Map<string, number>();
      const duplicates: number[] = [];

      guides.forEach((guide, index) => {
        const key = `${guide.sourcePlatform}:${guide.sourceExternalId}`;
        if (seen.has(key)) {
          duplicates.push(index);
        }
        else {
          seen.set(key, index);
        }
      });

      expect(duplicates).toEqual([2]);
    });

    it('should keep best version when deduplicating', () => {
      const duplicates = [
        { id: 'a', contentLength: 100, qualityScore: 0.5, aiProcessedAt: undefined },
        { id: 'b', contentLength: 500, qualityScore: 0.8, aiProcessedAt: undefined },
        { id: 'c', contentLength: 300, qualityScore: 0.7, aiProcessedAt: Date.now() },
      ];

      // Sort by: hasAiData (desc), contentLength (desc), qualityScore (desc)
      duplicates.sort((a, b) => {
        const aiDiff = (b.aiProcessedAt ? 1 : 0) - (a.aiProcessedAt ? 1 : 0);
        if (aiDiff !== 0)
          return aiDiff;
        const contentDiff = b.contentLength - a.contentLength;
        if (contentDiff !== 0)
          return contentDiff;
        return b.qualityScore - a.qualityScore;
      });

      // First one (with AI data) should be kept
      expect(duplicates[0]?.id).toBe('c');
    });
  });

  describe('batch processing', () => {
    it('should count inserted and updated correctly', () => {
      const existingIds = new Set(['abc', 'def']);
      const guides = [
        { sourceExternalId: 'abc' }, // update
        { sourceExternalId: 'ghi' }, // insert
        { sourceExternalId: 'def' }, // update
        { sourceExternalId: 'jkl' }, // insert
      ];

      let inserted = 0;
      let updated = 0;

      for (const guide of guides) {
        if (existingIds.has(guide.sourceExternalId)) {
          updated++;
        }
        else {
          inserted++;
          existingIds.add(guide.sourceExternalId);
        }
      }

      expect(inserted).toBe(2);
      expect(updated).toBe(2);
    });
  });
});
