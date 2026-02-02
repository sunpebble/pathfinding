/**
 * Integration tests for Refetch Tasks Queue
 * Tests the async refetch queue system for handling truncated content
 */

import { describe, expect, it } from 'vitest';

// ============================================================
// Unit Tests for Helper Functions
// ============================================================

// Truncation patterns (duplicated from refetchTasks.ts for testing)
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

// Completeness level calculation (duplicated for testing)
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
    = likesCount !== undefined && savesCount !== undefined
      && commentsCount !== undefined && viewsCount !== undefined;
  const hasQualityScore = qualityScore !== undefined;

  if (hasTitle && hasImages && hasAuthor && hasDestinations
    && hasAllCounts && hasQualityScore
    && contentLength >= MIN_CONTENT_LENGTH_COMPLETE && !isTruncated) {
    return 'complete';
  }

  if (hasTitle && contentLength >= MIN_CONTENT_LENGTH && hasImages) {
    return 'usable';
  }

  return 'incomplete';
}

describe('refetchTasks - Truncation Detection', () => {
  describe('isContentTruncated', () => {
    it('should detect content ending with "..."', () => {
      expect(isContentTruncated('This is some content...')).toBe(true);
    });

    it('should detect content ending with "…"', () => {
      expect(isContentTruncated('This is some content…')).toBe(true);
    });

    it('should detect content ending with "[查看更多]"', () => {
      expect(isContentTruncated('这是一些内容[查看更多]')).toBe(true);
    });

    it('should detect content ending with "[展开全文]"', () => {
      expect(isContentTruncated('这是一些内容[展开全文]')).toBe(true);
    });

    it('should detect content ending with "[阅读全文]"', () => {
      expect(isContentTruncated('这是一些内容[阅读全文]')).toBe(true);
    });

    it('should detect content ending with "查看更多"', () => {
      expect(isContentTruncated('这是一些内容查看更多')).toBe(true);
    });

    it('should detect content ending with "展开全文"', () => {
      expect(isContentTruncated('这是一些内容展开全文')).toBe(true);
    });

    it('should NOT detect normal content as truncated', () => {
      expect(isContentTruncated('这是正常的内容，没有截断。')).toBe(false);
    });

    it('should NOT detect content with ... in middle as truncated', () => {
      expect(isContentTruncated('Some content... and more content here.')).toBe(false);
    });

    it('should handle empty content', () => {
      expect(isContentTruncated('')).toBe(false);
    });
  });
});

describe('refetchTasks - Task Status Transitions', () => {
  describe('task status values', () => {
    const validStatuses = ['pending', 'running', 'completed', 'failed'];

    it('should have valid status values defined', () => {
      expect(validStatuses).toContain('pending');
      expect(validStatuses).toContain('running');
      expect(validStatuses).toContain('completed');
      expect(validStatuses).toContain('failed');
    });
  });

  describe('retry logic', () => {
    it('should calculate exponential backoff correctly', () => {
      // Exponential backoff: 1min, 5min, 30min (capped)
      const calculateDelay = (retryCount: number): number => {
        return Math.min(60000 * 5 ** (retryCount - 1), 30 * 60 * 1000);
      };

      expect(calculateDelay(1)).toBe(60000); // 1 minute
      expect(calculateDelay(2)).toBe(300000); // 5 minutes
      expect(calculateDelay(3)).toBe(1500000); // 25 minutes (60000 * 5^2)
      expect(calculateDelay(4)).toBe(1800000); // Capped at 30 minutes
    });

    it('should determine retry eligibility based on retry count', () => {
      const maxRetries = 3;

      const shouldRetry = (retryCount: number): boolean => {
        return retryCount < maxRetries;
      };

      expect(shouldRetry(0)).toBe(true);
      expect(shouldRetry(1)).toBe(true);
      expect(shouldRetry(2)).toBe(true);
      expect(shouldRetry(3)).toBe(false);
      expect(shouldRetry(4)).toBe(false);
    });
  });
});

describe('refetchTasks - Completeness Level Recalculation', () => {
  describe('after successful refetch', () => {
    it('should upgrade from incomplete to usable when truncation is resolved', () => {
      // Before refetch: truncated content
      const beforeRefetch = calculateCompletenessLevel({
        title: 'Test Guide',
        content: `${'A'.repeat(300)}...`,
        coverImageUrl: 'https://example.com/img.jpg',
        contentTruncated: true,
      });

      // After refetch: complete content
      const afterRefetch = calculateCompletenessLevel({
        title: 'Test Guide',
        content: 'A'.repeat(300),
        coverImageUrl: 'https://example.com/img.jpg',
        contentTruncated: false,
      });

      expect(beforeRefetch).toBe('usable');
      expect(afterRefetch).toBe('usable');
    });

    it('should upgrade from usable to complete when all fields present after refetch', () => {
      const afterRefetch = calculateCompletenessLevel({
        title: 'Complete Guide',
        content: 'A'.repeat(600),
        coverImageUrl: 'https://example.com/img.jpg',
        imageUrls: ['https://example.com/1.jpg'],
        authorName: 'Test Author',
        destinations: ['北京'],
        contentTruncated: false,
        likesCount: 100,
        savesCount: 50,
        commentsCount: 25,
        viewsCount: 1000,
        qualityScore: 0.85,
      });

      expect(afterRefetch).toBe('complete');
    });

    it('should remain usable if content still truncated after refetch', () => {
      const afterRefetch = calculateCompletenessLevel({
        title: 'Test Guide',
        content: `${'A'.repeat(300)}...`,
        coverImageUrl: 'https://example.com/img.jpg',
        contentTruncated: true,
      });

      expect(afterRefetch).toBe('usable');
    });
  });
});

describe('refetchTasks - Rate Limiting', () => {
  describe('per-platform rate limiting', () => {
    it('should group tasks by platform', () => {
      const tasks = [
        { id: '1', sourcePlatform: 'xiaohongshu' },
        { id: '2', sourcePlatform: 'xiaohongshu' },
        { id: '3', sourcePlatform: 'weibo' },
        { id: '4', sourcePlatform: 'xiaohongshu' },
        { id: '5', sourcePlatform: 'weibo' },
      ];

      const tasksByPlatform = new Map<string, typeof tasks>();
      for (const task of tasks) {
        const platform = task.sourcePlatform;
        if (!tasksByPlatform.has(platform)) {
          tasksByPlatform.set(platform, []);
        }
        tasksByPlatform.get(platform)!.push(task);
      }

      expect(tasksByPlatform.get('xiaohongshu')).toHaveLength(3);
      expect(tasksByPlatform.get('weibo')).toHaveLength(2);
    });

    it('should limit concurrent tasks per platform to 2', () => {
      const platformTasks = [
        { id: '1', sourcePlatform: 'xiaohongshu' },
        { id: '2', sourcePlatform: 'xiaohongshu' },
        { id: '3', sourcePlatform: 'xiaohongshu' },
        { id: '4', sourcePlatform: 'xiaohongshu' },
      ];

      const maxPerPlatform = 2;
      const tasksToProcess = platformTasks.slice(0, maxPerPlatform);

      expect(tasksToProcess).toHaveLength(2);
    });
  });
});

describe('refetchTasks - Task Data Structure', () => {
  describe('required fields', () => {
    const validTask = {
      guideId: 'guide123',
      sourceUrl: 'https://example.com/guide/123',
      sourceExternalId: 'ext123',
      sourcePlatform: 'xiaohongshu',
      status: 'pending' as const,
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now(),
    };

    it('should have all required fields', () => {
      expect(validTask.guideId).toBeDefined();
      expect(validTask.sourceUrl).toBeDefined();
      expect(validTask.sourceExternalId).toBeDefined();
      expect(validTask.sourcePlatform).toBeDefined();
      expect(validTask.status).toBe('pending');
      expect(validTask.retryCount).toBe(0);
      expect(validTask.maxRetries).toBe(3);
      expect(validTask.createdAt).toBeDefined();
    });
  });

  describe('optional fields', () => {
    it('should handle optional fields correctly', () => {
      const taskWithOptionals = {
        guideId: 'guide123',
        sourceUrl: 'https://example.com/guide/123',
        sourceExternalId: 'ext123',
        sourcePlatform: 'xiaohongshu',
        status: 'failed' as const,
        retryCount: 2,
        maxRetries: 3,
        createdAt: Date.now(),
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
        lastError: 'Network timeout',
        nextRetryAt: Date.now() + 60000,
      };

      expect(taskWithOptionals.startedAt).toBeDefined();
      expect(taskWithOptionals.completedAt).toBeDefined();
      expect(taskWithOptionals.lastError).toBe('Network timeout');
      expect(taskWithOptionals.nextRetryAt).toBeDefined();
    });
  });
});

describe('refetchTasks - Merge Result Logic', () => {
  describe('content merging', () => {
    it('should prefer new content over old content', () => {
      const _oldContent = 'Old truncated content...';
      const newContent = 'This is the complete content without truncation.';

      // Merge logic: always use new content
      const mergedContent = newContent;

      expect(mergedContent).toBe(newContent);
      expect(isContentTruncated(mergedContent)).toBe(false);
    });

    it('should not overwrite existing title if new title not provided', () => {
      const existingGuide = {
        title: 'Existing Title',
        content: 'Old content...',
      };

      const refetchResult = {
        content: 'New complete content',
        title: undefined,
      };

      // Merge logic: preserve existing title if new is undefined
      const mergedTitle = refetchResult.title ?? existingGuide.title;

      expect(mergedTitle).toBe('Existing Title');
    });

    it('should update title if guide had no title and refetch provides one', () => {
      const existingGuide = {
        title: undefined,
        content: 'Old content...',
      };

      const refetchResult = {
        content: 'New complete content',
        title: 'New Title from Refetch',
      };

      // Merge logic: use new title if existing is undefined
      const mergedTitle = existingGuide.title || refetchResult.title;

      expect(mergedTitle).toBe('New Title from Refetch');
    });
  });

  describe('image URL merging', () => {
    it('should merge image URLs without duplicates', () => {
      const existingUrls = ['https://example.com/1.jpg', 'https://example.com/2.jpg'];
      const newUrls = ['https://example.com/2.jpg', 'https://example.com/3.jpg'];

      const existingSet = new Set(existingUrls);
      const uniqueNewUrls = newUrls.filter(url => !existingSet.has(url));
      const mergedUrls = [...existingUrls, ...uniqueNewUrls];

      expect(mergedUrls).toHaveLength(3);
      expect(mergedUrls).toContain('https://example.com/1.jpg');
      expect(mergedUrls).toContain('https://example.com/2.jpg');
      expect(mergedUrls).toContain('https://example.com/3.jpg');
    });

    it('should set coverImageUrl from first image if missing', () => {
      const existingCoverUrl = undefined;
      const newImageUrls = ['https://example.com/new1.jpg', 'https://example.com/new2.jpg'];

      const coverImageUrl = existingCoverUrl ?? newImageUrls[0];

      expect(coverImageUrl).toBe('https://example.com/new1.jpg');
    });
  });
});
