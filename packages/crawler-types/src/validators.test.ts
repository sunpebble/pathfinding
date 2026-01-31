import { describe, expect, it } from 'vitest';
import {
  isContentTruncated,
  isValidPlatform,
  MIN_CONTENT_LENGTH,
  VALID_PLATFORMS,
  validateGuide,
  validateGuides,
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
        expect.objectContaining({ field: 'sourceExternalId', error: 'required' }),
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
        const result = validateGuide({ ...validGuide, sourcePlatform: platform });
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
    expect(isContentTruncated('Normal content without truncation.')).toBe(false);
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
