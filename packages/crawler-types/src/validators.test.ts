import { describe, expect, it } from 'vitest';
import {
  calculateCompletenessLevel,
  isContentTruncated,
  isValidPlatform,
  MAX_TITLE_LENGTH,
  MIN_CONTENT_LENGTH,
  MIN_CONTENT_LENGTH_COMPLETE,
  VALID_PLATFORMS,
  validateAuthor,
  validateGuide,
  validateGuideEnhanced,
  validateGuides,
  validateImages,
  validateTitle,
} from './validators.js';

describe('validateGuide', () => {
  const validGuide = {
    sourcePlatform: 'xiaohongshu',
    sourceExternalId: 'abc123',
    content: 'A'.repeat(250), // 250 chars, above minimum
    destinations: ['北京'],
  };

  describe('required fields', () => {
    it('should pass with all required fields', () => {
      const result = validateGuide(validGuide);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when sourcePlatform is missing', () => {
      const result = validateGuide({
        ...validGuide,
        sourcePlatform: undefined,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'sourcePlatform', error: 'required' }),
      );
    });

    it('should fail when sourceExternalId is missing', () => {
      const result = validateGuide({
        ...validGuide,
        sourceExternalId: undefined,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'sourceExternalId',
          error: 'required',
        }),
      );
    });

    it('should fail when content is missing', () => {
      const result = validateGuide({
        ...validGuide,
        content: undefined,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'content', error: 'required' }),
      );
    });

    it('should fail when destinations is missing', () => {
      const result = validateGuide({
        ...validGuide,
        destinations: undefined,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'destinations', error: 'required' }),
      );
    });

    it('should fail when destinations is empty array', () => {
      const result = validateGuide({
        ...validGuide,
        destinations: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'destinations',
          error: 'must have at least one item',
        }),
      );
    });
  });

  describe('platform validation', () => {
    it('should accept valid platforms', () => {
      for (const platform of VALID_PLATFORMS) {
        const result = validateGuide({
          ...validGuide,
          sourcePlatform: platform,
        });
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid platform', () => {
      const result = validateGuide({
        ...validGuide,
        sourcePlatform: 'invalid_platform',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'sourcePlatform',
          error: expect.stringContaining('must be one of'),
        }),
      );
    });
  });

  describe('content length validation', () => {
    it('should pass with content at minimum length', () => {
      const result = validateGuide({
        ...validGuide,
        content: 'A'.repeat(MIN_CONTENT_LENGTH),
      });
      expect(result.valid).toBe(true);
    });

    it('should fail with content below minimum length', () => {
      const result = validateGuide({
        ...validGuide,
        content: 'A'.repeat(MIN_CONTENT_LENGTH - 1),
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'content',
          error: expect.stringContaining('minimum length'),
        }),
      );
    });
  });

  describe('numeric fields validation', () => {
    it('should pass with valid numeric fields', () => {
      const result = validateGuide({
        ...validGuide,
        likesCount: 100,
        savesCount: 50,
        commentsCount: 25,
        viewsCount: 1000,
        qualityScore: 0.85,
      });
      expect(result.valid).toBe(true);
    });

    it('should fail with negative likesCount', () => {
      const result = validateGuide({
        ...validGuide,
        likesCount: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'likesCount',
          error: 'must be non-negative',
        }),
      );
    });

    it('should fail with qualityScore above 1', () => {
      const result = validateGuide({
        ...validGuide,
        qualityScore: 1.5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'qualityScore',
          error: 'must be between 0 and 1',
        }),
      );
    });

    it('should fail with qualityScore below 0', () => {
      const result = validateGuide({
        ...validGuide,
        qualityScore: -0.1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'qualityScore',
          error: 'must be between 0 and 1',
        }),
      );
    });
  });

  describe('snake_case field support', () => {
    it('should accept snake_case field names', () => {
      const result = validateGuide({
        source_platform: 'xiaohongshu',
        source_external_id: 'abc123',
        content: 'A'.repeat(250),
        destinations: ['北京'],
        likes_count: 100,
        quality_score: 0.8,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('truncation warnings', () => {
    it('should warn about truncated content ending with ...', () => {
      const result = validateGuide({
        ...validGuide,
        content: `${'A'.repeat(250)}...`,
      });
      expect(result.valid).toBe(true); // Still valid, just a warning
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'content',
          warning: 'content appears to be truncated',
        }),
      );
    });

    it('should warn about truncated content ending with [查看更多]', () => {
      const result = validateGuide({
        ...validGuide,
        content: `${'A'.repeat(250)}[查看更多]`,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'content',
          warning: 'content appears to be truncated',
        }),
      );
    });
  });

  describe('multiple errors', () => {
    it('should return all validation errors at once', () => {
      const result = validateGuide({
        // Missing all required fields
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });
});

describe('validateGuides', () => {
  const validGuide = {
    sourcePlatform: 'xiaohongshu',
    sourceExternalId: 'abc123',
    content: 'A'.repeat(250),
    destinations: ['北京'],
  };

  it('should validate multiple guides', () => {
    const result = validateGuides([
      validGuide,
      { ...validGuide, sourceExternalId: 'def456' },
    ]);
    expect(result.valid).toBe(true);
    expect(result.totalErrors).toBe(0);
  });

  it('should return invalid results only when some fail', () => {
    const result = validateGuides([
      validGuide,
      { ...validGuide, content: 'too short' }, // Invalid
      { ...validGuide, sourceExternalId: 'ghi789' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.results).toHaveLength(1); // Only invalid result
    expect(result.results[0]?.index).toBe(1);
  });
});

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
    expect(isContentTruncated('Normal content without truncation.')).toBe(
      false,
    );
  });
});

describe('isValidPlatform', () => {
  it('should return true for valid platforms', () => {
    expect(isValidPlatform('xiaohongshu')).toBe(true);
    expect(isValidPlatform('weibo')).toBe(true);
    expect(isValidPlatform('ctrip')).toBe(true);
  });

  it('should return false for invalid platforms', () => {
    expect(isValidPlatform('invalid')).toBe(false);
    expect(isValidPlatform('')).toBe(false);
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
      expect(
        calculateCompletenessLevel({
          ...completeGuide,
          contentTruncated: true,
        }),
      ).not.toBe('complete');
    });

    it('should NOT return "complete" if content < 500 chars', () => {
      expect(
        calculateCompletenessLevel({
          ...completeGuide,
          content: 'A'.repeat(MIN_CONTENT_LENGTH_COMPLETE - 1),
        }),
      ).not.toBe('complete');
    });

    it('should NOT return "complete" if missing title', () => {
      expect(
        calculateCompletenessLevel({
          ...completeGuide,
          title: undefined,
        }),
      ).not.toBe('complete');
    });

    it('should NOT return "complete" if missing author', () => {
      expect(
        calculateCompletenessLevel({
          ...completeGuide,
          authorName: undefined,
        }),
      ).not.toBe('complete');
    });

    it('should NOT return "complete" if missing images', () => {
      expect(
        calculateCompletenessLevel({
          ...completeGuide,
          coverImageUrl: undefined,
          imageUrls: [],
        }),
      ).not.toBe('complete');
    });

    it('should NOT return "complete" if missing counts', () => {
      expect(
        calculateCompletenessLevel({
          ...completeGuide,
          likesCount: undefined,
        }),
      ).not.toBe('complete');
    });
  });

  describe('usable level', () => {
    it('should return "usable" with title + content >= 200 + images', () => {
      expect(
        calculateCompletenessLevel({
          title: 'My Guide',
          content: 'A'.repeat(MIN_CONTENT_LENGTH),
          coverImageUrl: 'https://example.com/img.jpg',
        }),
      ).toBe('usable');
    });

    it('should return "usable" even without author or counts', () => {
      expect(
        calculateCompletenessLevel({
          title: 'My Guide',
          content: 'A'.repeat(300),
          imageUrls: ['https://example.com/img.jpg'],
        }),
      ).toBe('usable');
    });
  });

  describe('incomplete level', () => {
    it('should return "incomplete" when missing title', () => {
      expect(
        calculateCompletenessLevel({
          content: 'A'.repeat(300),
          coverImageUrl: 'https://example.com/img.jpg',
        }),
      ).toBe('incomplete');
    });

    it('should return "incomplete" when missing images', () => {
      expect(
        calculateCompletenessLevel({
          title: 'My Guide',
          content: 'A'.repeat(300),
        }),
      ).toBe('incomplete');
    });

    it('should return "incomplete" when content < 200 chars', () => {
      expect(
        calculateCompletenessLevel({
          title: 'My Guide',
          content: 'A'.repeat(100),
          coverImageUrl: 'https://example.com/img.jpg',
        }),
      ).toBe('incomplete');
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
    const result = validateImages(undefined, [
      'https://example.com/first.jpg',
      'https://example.com/second.jpg',
    ]);
    expect(result.coverImageUrl).toBe('https://example.com/first.jpg');
  });

  it('should return hasImages=false and warning with no images', () => {
    const result = validateImages(undefined, []);
    expect(result.hasImages).toBe(false);
    expect(result.warning).toBeDefined();
  });

  it('should filter empty strings from imageUrls', () => {
    const result = validateImages(undefined, [
      '',
      'https://example.com/valid.jpg',
      '',
    ]);
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
    expect(['complete', 'usable', 'incomplete']).toContain(
      result.completenessLevel,
    );
  });

  it('should return normalized data', () => {
    const result = validateGuideEnhanced({
      ...validInput,
      title: 'Test Title',
      coverImageUrl: 'https://example.com/img.jpg',
    });
    expect(result.normalizedData.title).toBe('Test Title');
    expect(result.normalizedData.coverImageUrl).toBe(
      'https://example.com/img.jpg',
    );
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
