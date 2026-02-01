/**
 * Tests for iOS Display Fields validation and auto-fill functions
 */

import { describe, expect, it } from 'vitest';
import {
  fillMissingDisplayFields,
  IOS_REQUIRED_DISPLAY_FIELDS,
  PLATFORM_DEFAULT_IMAGES,
  validateDisplayFields,
} from './displayFields';

describe('iOS_REQUIRED_DISPLAY_FIELDS', () => {
  it('should contain all required fields', () => {
    expect(IOS_REQUIRED_DISPLAY_FIELDS).toContain('title');
    expect(IOS_REQUIRED_DISPLAY_FIELDS).toContain('coverImageUrl');
    expect(IOS_REQUIRED_DISPLAY_FIELDS).toContain('authorName');
    expect(IOS_REQUIRED_DISPLAY_FIELDS).toContain('destinations');
    expect(IOS_REQUIRED_DISPLAY_FIELDS).toContain('likesCount');
    expect(IOS_REQUIRED_DISPLAY_FIELDS).toContain('savesCount');
    expect(IOS_REQUIRED_DISPLAY_FIELDS).toContain('commentsCount');
    expect(IOS_REQUIRED_DISPLAY_FIELDS).toContain('viewsCount');
    expect(IOS_REQUIRED_DISPLAY_FIELDS).toContain('qualityScore');
  });
});

describe('pLATFORM_DEFAULT_IMAGES', () => {
  it('should have default images for all platforms', () => {
    expect(PLATFORM_DEFAULT_IMAGES.xiaohongshu).toBeDefined();
    expect(PLATFORM_DEFAULT_IMAGES.weibo).toBeDefined();
    expect(PLATFORM_DEFAULT_IMAGES.ctrip).toBeDefined();
    expect(PLATFORM_DEFAULT_IMAGES.douyin).toBeDefined();
    expect(PLATFORM_DEFAULT_IMAGES.default).toBeDefined();
  });
});

describe('validateDisplayFields', () => {
  it('should return valid for guide with all fields present', () => {
    const guide = {
      title: 'Test Guide',
      coverImageUrl: 'https://example.com/image.jpg',
      authorName: 'Test Author',
      destinations: ['Beijing'],
      likesCount: 10,
      savesCount: 5,
      commentsCount: 3,
      viewsCount: 100,
      qualityScore: 0.8,
    };

    const result = validateDisplayFields(guide);
    expect(result.isValid).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  it('should detect missing title', () => {
    const guide = {
      coverImageUrl: 'https://example.com/image.jpg',
      authorName: 'Test Author',
      destinations: ['Beijing'],
      likesCount: 10,
      savesCount: 5,
      commentsCount: 3,
      viewsCount: 100,
      qualityScore: 0.8,
    };

    const result = validateDisplayFields(guide);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('title');
  });

  it('should detect empty string title', () => {
    const guide = {
      title: '   ',
      coverImageUrl: 'https://example.com/image.jpg',
      authorName: 'Test Author',
      destinations: ['Beijing'],
      likesCount: 10,
      savesCount: 5,
      commentsCount: 3,
      viewsCount: 100,
      qualityScore: 0.8,
    };

    const result = validateDisplayFields(guide);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('title');
  });

  it('should accept coverImageUrl from imageUrls fallback', () => {
    const guide = {
      title: 'Test Guide',
      imageUrls: ['https://example.com/image.jpg'],
      authorName: 'Test Author',
      destinations: ['Beijing'],
      likesCount: 10,
      savesCount: 5,
      commentsCount: 3,
      viewsCount: 100,
      qualityScore: 0.8,
    };

    const result = validateDisplayFields(guide);
    expect(result.missingFields).not.toContain('coverImageUrl');
  });

  it('should detect missing coverImageUrl when imageUrls is also empty', () => {
    const guide = {
      title: 'Test Guide',
      imageUrls: [],
      authorName: 'Test Author',
      destinations: ['Beijing'],
      likesCount: 10,
      savesCount: 5,
      commentsCount: 3,
      viewsCount: 100,
      qualityScore: 0.8,
    };

    const result = validateDisplayFields(guide);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('coverImageUrl');
  });

  it('should detect missing authorName', () => {
    const guide = {
      title: 'Test Guide',
      coverImageUrl: 'https://example.com/image.jpg',
      destinations: ['Beijing'],
      likesCount: 10,
      savesCount: 5,
      commentsCount: 3,
      viewsCount: 100,
      qualityScore: 0.8,
    };

    const result = validateDisplayFields(guide);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('authorName');
  });

  it('should detect missing count fields', () => {
    const guide = {
      title: 'Test Guide',
      coverImageUrl: 'https://example.com/image.jpg',
      authorName: 'Test Author',
      destinations: ['Beijing'],
      qualityScore: 0.8,
    };

    const result = validateDisplayFields(guide);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('likesCount');
    expect(result.missingFields).toContain('savesCount');
    expect(result.missingFields).toContain('commentsCount');
    expect(result.missingFields).toContain('viewsCount');
  });

  it('should detect missing qualityScore', () => {
    const guide = {
      title: 'Test Guide',
      coverImageUrl: 'https://example.com/image.jpg',
      authorName: 'Test Author',
      destinations: ['Beijing'],
      likesCount: 10,
      savesCount: 5,
      commentsCount: 3,
      viewsCount: 100,
    };

    const result = validateDisplayFields(guide);
    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('qualityScore');
  });

  it('should detect multiple missing fields', () => {
    const guide = {};

    const result = validateDisplayFields(guide);
    expect(result.isValid).toBe(false);
    expect(result.missingFields.length).toBeGreaterThan(5);
  });
});

describe('fillMissingDisplayFields', () => {
  it('should fill missing title from content', () => {
    const guide = {
      content: 'This is a test content for the travel guide that is quite long.',
    };

    const result = fillMissingDisplayFields(guide);
    expect(result.title).toBe('This is a test content for the...');
  });

  it('should use full content as title if short enough', () => {
    const guide = {
      content: 'Short content',
    };

    const result = fillMissingDisplayFields(guide);
    expect(result.title).toBe('Short content');
  });

  it('should use default title when no content', () => {
    const guide = {};

    const result = fillMissingDisplayFields(guide);
    expect(result.title).toBe('无标题攻略');
  });

  it('should fill coverImageUrl from imageUrls', () => {
    const guide = {
      imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    };

    const result = fillMissingDisplayFields(guide);
    expect(result.coverImageUrl).toBe('https://example.com/image1.jpg');
  });

  it('should use platform default image when no images available', () => {
    const guide = {
      sourcePlatform: 'xiaohongshu' as const,
      imageUrls: [],
    };

    const result = fillMissingDisplayFields(guide);
    expect(result.coverImageUrl).toBe(PLATFORM_DEFAULT_IMAGES.xiaohongshu);
  });

  it('should use generic default image for unknown platform', () => {
    const guide = {
      imageUrls: [],
    };

    const result = fillMissingDisplayFields(guide);
    expect(result.coverImageUrl).toBe(PLATFORM_DEFAULT_IMAGES.default);
  });

  it('should fill authorName with default', () => {
    const guide = {};

    const result = fillMissingDisplayFields(guide);
    expect(result.authorName).toBe('匿名用户');
  });

  it('should fill empty destinations array', () => {
    const guide = {};

    const result = fillMissingDisplayFields(guide);
    expect(result.destinations).toEqual([]);
  });

  it('should fill count fields with 0', () => {
    const guide = {};

    const result = fillMissingDisplayFields(guide);
    expect(result.likesCount).toBe(0);
    expect(result.savesCount).toBe(0);
    expect(result.commentsCount).toBe(0);
    expect(result.viewsCount).toBe(0);
  });

  it('should fill qualityScore with 0.5', () => {
    const guide = {};

    const result = fillMissingDisplayFields(guide);
    expect(result.qualityScore).toBe(0.5);
  });

  it('should NOT overwrite existing non-empty values', () => {
    const guide = {
      title: 'Existing Title',
      coverImageUrl: 'https://existing.com/image.jpg',
      authorName: 'Existing Author',
      destinations: ['Shanghai'],
      likesCount: 100,
      savesCount: 50,
      commentsCount: 20,
      viewsCount: 1000,
      qualityScore: 0.9,
    };

    const result = fillMissingDisplayFields(guide);
    expect(result.title).toBe('Existing Title');
    expect(result.coverImageUrl).toBe('https://existing.com/image.jpg');
    expect(result.authorName).toBe('Existing Author');
    expect(result.destinations).toEqual(['Shanghai']);
    expect(result.likesCount).toBe(100);
    expect(result.savesCount).toBe(50);
    expect(result.commentsCount).toBe(20);
    expect(result.viewsCount).toBe(1000);
    expect(result.qualityScore).toBe(0.9);
  });

  it('should handle partial data correctly', () => {
    const guide = {
      title: 'My Guide',
      content: 'Some content',
      imageUrls: ['https://example.com/img.jpg'],
      likesCount: 5,
    };

    const result = fillMissingDisplayFields(guide);
    expect(result.title).toBe('My Guide'); // Preserved
    expect(result.coverImageUrl).toBe('https://example.com/img.jpg'); // From imageUrls
    expect(result.authorName).toBe('匿名用户'); // Default
    expect(result.likesCount).toBe(5); // Preserved
    expect(result.savesCount).toBe(0); // Default
  });
});
