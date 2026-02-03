/**
 * Tests for Xiaohongshu (小红书) crawler parsing logic
 * Tests content extraction, note parsing, and data normalization
 */

import { describe, expect, it } from 'vitest';

// ============================================================
// Type Definitions (from xiaohongshu.ts)
// ============================================================

interface XiaohongshuNote {
  note_id: string;
  title?: string;
  desc?: string;
  type?: string;
  user?: {
    user_id?: string;
    nickname?: string;
    avatar?: string;
  };
  interact_info?: {
    liked_count?: string;
    collected_count?: string;
    comment_count?: string;
  };
  image_list?: Array<{
    url_default?: string;
    url?: string;
    width?: number;
    height?: number;
  }>;
}

// ============================================================
// Helper Functions (extracted for testing)
// ============================================================

function parseInteractCount(value: string | undefined): number {
  if (!value)
    return 0;
  const trimmed = value.trim();
  if (trimmed.endsWith('万')) {
    return Math.round(Number.parseFloat(trimmed.replace('万', '')) * 10000);
  }
  if (trimmed.endsWith('k') || trimmed.endsWith('K')) {
    return Math.round(Number.parseFloat(trimmed.replace(/k/i, '')) * 1000);
  }
  return Number.parseInt(trimmed, 10) || 0;
}

function extractNoteId(url: string): string | null {
  // Match patterns like /explore/noteId or /discovery/item/noteId
  const patterns = [
    /\/explore\/([a-zA-Z0-9]+)/,
    /\/discovery\/item\/([a-zA-Z0-9]+)/,
    /\/note\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1] ?? null;
    }
  }
  return null;
}

function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url)
    return undefined;
  // Remove query params that might cause issues
  const cleanUrl = url.split('?')[0];
  // Ensure HTTPS
  return cleanUrl?.replace(/^http:/, 'https:');
}

function extractImages(imageList: XiaohongshuNote['image_list']): string[] {
  if (!imageList || !Array.isArray(imageList))
    return [];

  return imageList
    .map(img => normalizeImageUrl(img.url_default || img.url))
    .filter((url): url is string => !!url);
}

// ============================================================
// Tests
// ============================================================

describe('xiaohongshu Crawler - URL Parsing', () => {
  describe('extractNoteId', () => {
    it('should extract note ID from explore URL', () => {
      const url = 'https://www.xiaohongshu.com/explore/abc123def456';
      expect(extractNoteId(url)).toBe('abc123def456');
    });

    it('should extract note ID from discovery URL', () => {
      const url = 'https://www.xiaohongshu.com/discovery/item/xyz789';
      expect(extractNoteId(url)).toBe('xyz789');
    });

    it('should extract note ID from note URL', () => {
      const url = 'https://www.xiaohongshu.com/note/note123';
      expect(extractNoteId(url)).toBe('note123');
    });

    it('should return null for invalid URL', () => {
      const url = 'https://www.xiaohongshu.com/user/profile';
      expect(extractNoteId(url)).toBeNull();
    });

    it('should handle URL with query params', () => {
      const url = 'https://www.xiaohongshu.com/explore/abc123?source=share';
      expect(extractNoteId(url)).toBe('abc123');
    });
  });
});

describe('xiaohongshu Crawler - Interact Count Parsing', () => {
  describe('parseInteractCount', () => {
    it('should parse plain numbers', () => {
      expect(parseInteractCount('123')).toBe(123);
      expect(parseInteractCount('0')).toBe(0);
      expect(parseInteractCount('9999')).toBe(9999);
    });

    it('should parse "万" (10k) suffix', () => {
      expect(parseInteractCount('1.5万')).toBe(15000);
      expect(parseInteractCount('10万')).toBe(100000);
      expect(parseInteractCount('0.8万')).toBe(8000);
    });

    it('should parse "k" suffix', () => {
      expect(parseInteractCount('1.5k')).toBe(1500);
      expect(parseInteractCount('10K')).toBe(10000);
    });

    it('should handle undefined', () => {
      expect(parseInteractCount(undefined)).toBe(0);
    });

    it('should handle empty string', () => {
      expect(parseInteractCount('')).toBe(0);
    });

    it('should handle invalid strings', () => {
      expect(parseInteractCount('abc')).toBe(0);
      expect(parseInteractCount('--')).toBe(0);
    });

    it('should trim whitespace', () => {
      expect(parseInteractCount('  123  ')).toBe(123);
      expect(parseInteractCount('  1.5万  ')).toBe(15000);
    });
  });
});

describe('xiaohongshu Crawler - Image Extraction', () => {
  describe('normalizeImageUrl', () => {
    it('should remove query parameters', () => {
      const url = 'https://example.com/image.jpg?size=large&quality=high';
      expect(normalizeImageUrl(url)).toBe('https://example.com/image.jpg');
    });

    it('should convert HTTP to HTTPS', () => {
      const url = 'http://example.com/image.jpg';
      expect(normalizeImageUrl(url)).toBe('https://example.com/image.jpg');
    });

    it('should handle undefined', () => {
      expect(normalizeImageUrl(undefined)).toBeUndefined();
    });

    it('should handle empty string', () => {
      expect(normalizeImageUrl('')).toBeUndefined();
    });
  });

  describe('extractImages', () => {
    it('should extract images from image_list', () => {
      const imageList = [
        { url_default: 'https://example.com/1.jpg' },
        { url_default: 'https://example.com/2.jpg' },
        { url: 'https://example.com/3.jpg' },
      ];

      const result = extractImages(imageList);
      expect(result).toHaveLength(3);
      expect(result).toContain('https://example.com/1.jpg');
      expect(result).toContain('https://example.com/2.jpg');
      expect(result).toContain('https://example.com/3.jpg');
    });

    it('should prefer url_default over url', () => {
      const imageList = [
        { url_default: 'https://example.com/default.jpg', url: 'https://example.com/alt.jpg' },
      ];

      const result = extractImages(imageList);
      expect(result[0]).toBe('https://example.com/default.jpg');
    });

    it('should filter out invalid URLs', () => {
      const imageList = [
        { url_default: 'https://example.com/valid.jpg' },
        { url_default: '' },
        { url_default: undefined },
        { url: 'https://example.com/another.jpg' },
      ];

      const result = extractImages(imageList);
      expect(result).toHaveLength(2);
    });

    it('should handle undefined imageList', () => {
      expect(extractImages(undefined)).toEqual([]);
    });

    it('should handle empty imageList', () => {
      expect(extractImages([])).toEqual([]);
    });
  });
});

describe('xiaohongshu Crawler - Note Data Normalization', () => {
  describe('note to guide conversion', () => {
    it('should extract all required fields from note', () => {
      const note: XiaohongshuNote = {
        note_id: 'test123',
        title: 'Test Travel Guide',
        desc: 'This is a test description for the travel guide.',
        type: 'normal',
        user: {
          user_id: 'user456',
          nickname: 'TestUser',
          avatar: 'https://example.com/avatar.jpg',
        },
        interact_info: {
          liked_count: '1.5万',
          collected_count: '8000',
          comment_count: '500',
        },
        image_list: [
          { url_default: 'https://example.com/cover.jpg' },
        ],
      };

      // Simulate conversion
      const guide = {
        sourceExternalId: note.note_id,
        title: note.title,
        content: note.desc,
        authorName: note.user?.nickname,
        authorId: note.user?.user_id,
        likesCount: parseInteractCount(note.interact_info?.liked_count),
        savesCount: parseInteractCount(note.interact_info?.collected_count),
        commentsCount: parseInteractCount(note.interact_info?.comment_count),
        imageUrls: extractImages(note.image_list),
      };

      expect(guide.sourceExternalId).toBe('test123');
      expect(guide.title).toBe('Test Travel Guide');
      expect(guide.authorName).toBe('TestUser');
      expect(guide.likesCount).toBe(15000);
      expect(guide.savesCount).toBe(8000);
      expect(guide.commentsCount).toBe(500);
      expect(guide.imageUrls).toHaveLength(1);
    });

    it('should handle missing optional fields', () => {
      const note: XiaohongshuNote = {
        note_id: 'minimal123',
      };

      const guide = {
        sourceExternalId: note.note_id,
        title: note.title || undefined,
        content: note.desc || '',
        authorName: note.user?.nickname,
        likesCount: parseInteractCount(note.interact_info?.liked_count),
        imageUrls: extractImages(note.image_list),
      };

      expect(guide.sourceExternalId).toBe('minimal123');
      expect(guide.title).toBeUndefined();
      expect(guide.content).toBe('');
      expect(guide.authorName).toBeUndefined();
      expect(guide.likesCount).toBe(0);
      expect(guide.imageUrls).toEqual([]);
    });
  });
});
