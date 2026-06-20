import { describe, expect, it } from 'vitest';
import {
  calculateCompletenessLevel,
  isContentTruncated,
  MAX_TITLE_LENGTH,
  MIN_CONTENT_LENGTH,
  MIN_CONTENT_LENGTH_COMPLETE,
  validateAuthor,
  validateGuideEnhanced,
  validateImages,
  validateTitle,
} from './validators.js';

describe('isContentTruncated', () => {
  it('should detect ... truncation', () => {
    expect(isContentTruncated('Some content...')).toBe(true);
  });

  it('should detect … truncation', () => {
    expect(isContentTruncated('Some content…')).toBe(true);
  });

  it('should detect [查看更多] truncation', () => {
    expect(isContentTruncated('Some content[查看更多]')).toBe(true);
  });

  it('should not flag normal content', () => {
    expect(isContentTruncated('Normal content without truncation.')).toBe(false);
  });
});

// ============================================================
// New Tests for Completeness Level System
// ============================================================

describe('calculateCompletenessLevel', () => {
  const completeGuide = {
    title: 'Complete Travel Guide',
    content: 'A'.repeat(MIN_CONTENT_LENGTH_COMPLETE + 100),
    coverImageUrl: 'https://example.com/cover.jpg',
    imageUrls: ['https://example.com/1.jpg'],
    authorName: 'Test Author',
    destinations: ['北京'],
    contentTruncated: false,
    likesCount: 100,
    savesCount: 50,
    commentsCount: 25,
    viewsCount: 1000,
    qualityScore: 0.85,
  };

  describe('complete level', () => {
    it('should return "complete" when all fields are present and content >= 500', () => {
      expect(calculateCompletenessLevel(completeGuide)).toBe('complete');
    });

    it('should NOT return "complete" if content is truncated', () => {
      expect(calculateCompletenessLevel({
        ...completeGuide,
        contentTruncated: true,
      })).not.toBe('complete');
    });

    it('should NOT return "complete" if content < 500 chars', () => {
      expect(calculateCompletenessLevel({
        ...completeGuide,
        content: 'A'.repeat(MIN_CONTENT_LENGTH_COMPLETE - 1),
      })).not.toBe('complete');
    });

    it('should NOT return "complete" if missing title', () => {
      expect(calculateCompletenessLevel({
        ...completeGuide,
        title: undefined,
      })).not.toBe('complete');
    });

    it('should NOT return "complete" if missing author', () => {
      expect(calculateCompletenessLevel({
        ...completeGuide,
        authorName: undefined,
      })).not.toBe('complete');
    });

    it('should NOT return "complete" if missing images', () => {
      expect(calculateCompletenessLevel({
        ...completeGuide,
        coverImageUrl: undefined,
        imageUrls: [],
      })).not.toBe('complete');
    });

    it('should NOT return "complete" if missing counts', () => {
      expect(calculateCompletenessLevel({
        ...completeGuide,
        likesCount: undefined,
      })).not.toBe('complete');
    });
  });

  describe('usable level', () => {
    it('should return "usable" with title + content >= 200 + images', () => {
      expect(calculateCompletenessLevel({
        title: 'My Guide',
        content: 'A'.repeat(MIN_CONTENT_LENGTH),
        coverImageUrl: 'https://example.com/img.jpg',
      })).toBe('usable');
    });

    it('should return "usable" even without author or counts', () => {
      expect(calculateCompletenessLevel({
        title: 'My Guide',
        content: 'A'.repeat(300),
        imageUrls: ['https://example.com/img.jpg'],
      })).toBe('usable');
    });
  });

  describe('incomplete level', () => {
    it('should return "incomplete" when missing title', () => {
      expect(calculateCompletenessLevel({
        content: 'A'.repeat(300),
        coverImageUrl: 'https://example.com/img.jpg',
      })).toBe('incomplete');
    });

    it('should return "incomplete" when missing images', () => {
      expect(calculateCompletenessLevel({
        title: 'My Guide',
        content: 'A'.repeat(300),
      })).toBe('incomplete');
    });

    it('should return "incomplete" when content < 200 chars', () => {
      expect(calculateCompletenessLevel({
        title: 'My Guide',
        content: 'A'.repeat(100),
        coverImageUrl: 'https://example.com/img.jpg',
      })).toBe('incomplete');
    });

    it('should return "incomplete" for empty input', () => {
      expect(calculateCompletenessLevel({})).toBe('incomplete');
    });
  });
});

describe('validateTitle', () => {
  it('should return title unchanged if valid', () => {
    const result = validateTitle('Valid Title');
    expect(result.title).toBe('Valid Title');
    expect(result.titleTruncated).toBe(false);
    expect(result.warning).toBeUndefined();
  });

  it('should return undefined with warning for empty title', () => {
    const result = validateTitle('');
    expect(result.title).toBeUndefined();
    expect(result.warning).toBeDefined();
  });

  it('should return undefined with warning for null title', () => {
    const result = validateTitle(null);
    expect(result.title).toBeUndefined();
    expect(result.warning).toBeDefined();
  });

  it('should truncate title exceeding MAX_TITLE_LENGTH', () => {
    const longTitle = 'A'.repeat(MAX_TITLE_LENGTH + 50);
    const result = validateTitle(longTitle);
    expect(result.title).toHaveLength(MAX_TITLE_LENGTH);
    expect(result.titleTruncated).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it('should trim whitespace', () => {
    const result = validateTitle('  Trimmed Title  ');
    expect(result.title).toBe('Trimmed Title');
  });
});

describe('validateImages', () => {
  it('should return hasImages=true with coverImageUrl', () => {
    const result = validateImages('https://example.com/cover.jpg', []);
    expect(result.hasImages).toBe(true);
    expect(result.coverImageUrl).toBe('https://example.com/cover.jpg');
  });

  it('should return hasImages=true with imageUrls only', () => {
    const result = validateImages(undefined, ['https://example.com/1.jpg']);
    expect(result.hasImages).toBe(true);
    expect(result.imageUrls).toHaveLength(1);
  });

  it('should auto-fill coverImageUrl from imageUrls[0]', () => {
    const result = validateImages(undefined, ['https://example.com/first.jpg', 'https://example.com/second.jpg']);
    expect(result.coverImageUrl).toBe('https://example.com/first.jpg');
  });

  it('should return hasImages=false and warning with no images', () => {
    const result = validateImages(undefined, []);
    expect(result.hasImages).toBe(false);
    expect(result.warning).toBeDefined();
  });

  it('should filter empty strings from imageUrls', () => {
    const result = validateImages(undefined, ['', 'https://example.com/valid.jpg', '']);
    expect(result.imageUrls).toEqual(['https://example.com/valid.jpg']);
  });
});

describe('validateAuthor', () => {
  it('should return authorName unchanged if valid', () => {
    const result = validateAuthor('Test Author');
    expect(result.authorName).toBe('Test Author');
    expect(result.warning).toBeUndefined();
  });

  it('should return undefined with warning for empty author', () => {
    const result = validateAuthor('');
    expect(result.authorName).toBeUndefined();
    expect(result.warning).toBeDefined();
  });

  it('should trim whitespace', () => {
    const result = validateAuthor('  Author Name  ');
    expect(result.authorName).toBe('Author Name');
  });
});

describe('validateGuideEnhanced', () => {
  const validInput = {
    sourcePlatform: 'xiaohongshu',
    sourceExternalId: 'abc123',
    content: 'A'.repeat(300),
    destinations: ['北京'],
  };

  it('should return valid=true with required fields', () => {
    const result = validateGuideEnhanced(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return errors for missing required fields', () => {
    const result = validateGuideEnhanced({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
    expect(result.errors.every(e => e.severity === 'error')).toBe(true);
  });

  it('should return warnings for missing optional fields', () => {
    const result = validateGuideEnhanced(validInput);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.every(w => w.severity === 'warning')).toBe(true);
  });

  it('should calculate completenessLevel', () => {
    const result = validateGuideEnhanced(validInput);
    expect(['complete', 'usable', 'incomplete']).toContain(result.completenessLevel);
  });

  it('should return normalized data', () => {
    const result = validateGuideEnhanced({
      ...validInput,
      title: 'Test Title',
      coverImageUrl: 'https://example.com/img.jpg',
    });
    expect(result.normalizedData.title).toBe('Test Title');
    expect(result.normalizedData.coverImageUrl).toBe('https://example.com/img.jpg');
  });

  it('should detect content truncation as warning', () => {
    const result = validateGuideEnhanced({
      ...validInput,
      content: `${'A'.repeat(300)}[查看更多]`,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.field === 'content')).toBe(true);
    expect(result.normalizedData.contentTruncated).toBe(true);
  });
});
