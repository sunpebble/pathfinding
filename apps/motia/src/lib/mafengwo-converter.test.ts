import type { MafengwoRawGuide } from './mafengwo-converter.js';
import { describe, expect, it } from 'vitest';
import {
  calculateQualityScore,
  convertToConvexFormat,
  determineCompletenessLevel,
  extractSourceExternalId,
  parseChineseNumber,
} from './mafengwo-converter.js';

// ============================================================================
// parseChineseNumber
// ============================================================================

describe('parseChineseNumber', () => {
  it('should return 0 for undefined', () => {
    expect(parseChineseNumber(undefined)).toBe(0);
  });

  it('should return 0 for empty string', () => {
    expect(parseChineseNumber('')).toBe(0);
  });

  it('should return 0 for non-numeric string', () => {
    expect(parseChineseNumber('abc')).toBe(0);
  });

  it('should parse plain integers', () => {
    expect(parseChineseNumber('42')).toBe(42);
    expect(parseChineseNumber('100')).toBe(100);
    expect(parseChineseNumber('0')).toBe(0);
  });

  it('should parse decimal numbers', () => {
    expect(parseChineseNumber('3.5')).toBe(4); // rounded
    expect(parseChineseNumber('1.2')).toBe(1);
  });

  it('should parse 万 (10000) suffix', () => {
    expect(parseChineseNumber('1万')).toBe(10000);
    expect(parseChineseNumber('1.2万')).toBe(12000);
    expect(parseChineseNumber('3.5万')).toBe(35000);
    expect(parseChineseNumber('10万')).toBe(100000);
  });

  it('should parse k (1000) suffix', () => {
    expect(parseChineseNumber('1k')).toBe(1000);
    expect(parseChineseNumber('3.5k')).toBe(3500);
    expect(parseChineseNumber('10K')).toBe(10000); // case insensitive
  });

  it('should handle whitespace', () => {
    expect(parseChineseNumber('  42  ')).toBe(42);
    expect(parseChineseNumber(' 1.2 万')).toBe(12000);
  });
});

// ============================================================================
// extractSourceExternalId
// ============================================================================

describe('extractSourceExternalId', () => {
  it('should extract ID from standard mobile URL', () => {
    expect(
      extractSourceExternalId('https://m.mafengwo.cn/i/24648165.html'),
    ).toBe('24648165');
  });

  it('should extract ID from desktop URL', () => {
    expect(
      extractSourceExternalId('https://www.mafengwo.cn/i/12345678.html'),
    ).toBe('12345678');
  });

  it('should extract from URL with query params', () => {
    expect(
      extractSourceExternalId(
        'https://m.mafengwo.cn/i/24648165.html?from=share',
      ),
    ).toBe('24648165');
  });

  it('should fallback to numeric extraction for non-standard URLs', () => {
    expect(extractSourceExternalId('https://mafengwo.cn/note/24648165')).toBe(
      '24648165',
    );
  });

  it('should throw for URLs without any numeric ID', () => {
    expect(() => extractSourceExternalId('https://mafengwo.cn/about')).toThrow(
      'Cannot extract external ID',
    );
  });

  it('should handle various path formats', () => {
    expect(
      extractSourceExternalId('https://m.mafengwo.cn/i/99999999.html'),
    ).toBe('99999999');
  });
});

// ============================================================================
// calculateQualityScore
// ============================================================================

describe('calculateQualityScore', () => {
  const fullGuide: MafengwoRawGuide = {
    title: '北京五日深度游完全攻略',
    content: 'A'.repeat(600),
    author: '旅行达人',
    views: '1.2万',
    likes: '500',
    coverImage: 'https://example.com/cover.jpg',
    images: ['img1', 'img2', 'img3', 'img4', 'img5'],
  };

  it('should return 1.0 for complete guide', () => {
    expect(calculateQualityScore(fullGuide)).toBe(1);
  });

  it('should give 0.2 for title >= 5 chars', () => {
    const guide: MafengwoRawGuide = {
      title: '足够长的标题',
      content: '',
      images: [],
    };
    expect(calculateQualityScore(guide)).toBeGreaterThanOrEqual(0.2);
  });

  it('should not give title score for short title', () => {
    const guide: MafengwoRawGuide = {
      title: '短',
      content: '',
      images: [],
    };
    expect(calculateQualityScore(guide)).toBe(0);
  });

  it('should give 0.4 for content >= 500 chars', () => {
    const guide: MafengwoRawGuide = {
      title: '',
      content: 'A'.repeat(500),
      images: [],
    };
    expect(calculateQualityScore(guide)).toBeGreaterThanOrEqual(0.4);
  });

  it('should give 0.3 for content 200-499 chars', () => {
    const guide: MafengwoRawGuide = {
      title: '',
      content: 'A'.repeat(300),
      images: [],
    };
    const score = calculateQualityScore(guide);
    expect(score).toBeGreaterThanOrEqual(0.3);
    expect(score).toBeLessThan(0.4);
  });

  it('should give 0.2 for content 100-199 chars', () => {
    const guide: MafengwoRawGuide = {
      title: '',
      content: 'A'.repeat(150),
      images: [],
    };
    const score = calculateQualityScore(guide);
    expect(score).toBeGreaterThanOrEqual(0.2);
    expect(score).toBeLessThan(0.3);
  });

  it('should give 0.1 for author', () => {
    const guide: MafengwoRawGuide = {
      title: '',
      content: '',
      author: '作者',
      images: [],
    };
    expect(calculateQualityScore(guide)).toBe(0.1);
  });

  it('should give 0.2 for >= 5 images', () => {
    const guide: MafengwoRawGuide = {
      title: '',
      content: '',
      images: ['1', '2', '3', '4', '5'],
    };
    expect(calculateQualityScore(guide)).toBe(0.2);
  });

  it('should give 0.1 for 1-4 images', () => {
    const guide: MafengwoRawGuide = {
      title: '',
      content: '',
      images: ['1', '2'],
    };
    expect(calculateQualityScore(guide)).toBe(0.1);
  });

  it('should give 0.1 for views or likes', () => {
    const guide: MafengwoRawGuide = {
      title: '',
      content: '',
      views: '100',
      images: [],
    };
    expect(calculateQualityScore(guide)).toBe(0.1);
  });

  it('should return 0 for completely empty guide', () => {
    const guide: MafengwoRawGuide = {
      title: '',
      content: '',
      images: [],
    };
    expect(calculateQualityScore(guide)).toBe(0);
  });

  it('should cap at 1.0', () => {
    expect(calculateQualityScore(fullGuide)).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// determineCompletenessLevel
// ============================================================================

describe('determineCompletenessLevel', () => {
  it('should return "complete" for full guide with high quality', () => {
    const guide: MafengwoRawGuide = {
      title: '完整标题',
      content: 'A'.repeat(600),
      author: '作者',
      images: ['img1', 'img2'],
    };
    expect(determineCompletenessLevel(guide, 0.9)).toBe('complete');
  });

  it('should not return "complete" if quality < 0.8', () => {
    const guide: MafengwoRawGuide = {
      title: '标题',
      content: 'A'.repeat(600),
      author: '作者',
      images: ['img1'],
    };
    expect(determineCompletenessLevel(guide, 0.5)).not.toBe('complete');
  });

  it('should not return "complete" if content < 500', () => {
    const guide: MafengwoRawGuide = {
      title: '标题',
      content: 'A'.repeat(300),
      author: '作者',
      images: ['img1'],
    };
    expect(determineCompletenessLevel(guide, 0.9)).not.toBe('complete');
  });

  it('should not return "complete" if missing author', () => {
    const guide: MafengwoRawGuide = {
      title: '标题',
      content: 'A'.repeat(600),
      images: ['img1'],
    };
    expect(determineCompletenessLevel(guide, 0.9)).not.toBe('complete');
  });

  it('should return "usable" for title + content >= 100 + images', () => {
    const guide: MafengwoRawGuide = {
      title: '足够长的标题',
      content: 'A'.repeat(200),
      images: ['img1'],
    };
    expect(determineCompletenessLevel(guide, 0.5)).toBe('usable');
  });

  it('should return "incomplete" if missing title', () => {
    const guide: MafengwoRawGuide = {
      title: '',
      content: 'A'.repeat(200),
      images: ['img1'],
    };
    expect(determineCompletenessLevel(guide, 0.5)).toBe('incomplete');
  });

  it('should return "incomplete" if content < 100', () => {
    const guide: MafengwoRawGuide = {
      title: '标题',
      content: 'A'.repeat(50),
      images: ['img1'],
    };
    expect(determineCompletenessLevel(guide, 0.5)).toBe('incomplete');
  });

  it('should return "incomplete" if no images', () => {
    const guide: MafengwoRawGuide = {
      title: '标题',
      content: 'A'.repeat(200),
      images: [],
    };
    expect(determineCompletenessLevel(guide, 0.5)).toBe('incomplete');
  });
});

// ============================================================================
// convertToConvexFormat
// ============================================================================

describe('convertToConvexFormat', () => {
  const sampleUrl = 'https://m.mafengwo.cn/i/24648165.html';
  const sampleGuide: MafengwoRawGuide = {
    title: '北京三日游攻略',
    content: 'A'.repeat(500),
    author: '旅行者',
    views: '1.2万',
    likes: '300',
    coverImage: 'https://example.com/cover.jpg',
    images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
  };

  it('should set sourcePlatform to "mafengwo"', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.sourcePlatform).toBe('mafengwo');
  });

  it('should extract sourceExternalId from URL', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.sourceExternalId).toBe('24648165');
  });

  it('should set sourceUrl', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.sourceUrl).toBe(sampleUrl);
  });

  it('should map title', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.title).toBe('北京三日游攻略');
  });

  it('should set title to undefined when empty', () => {
    const guide = { ...sampleGuide, title: '' };
    const result = convertToConvexFormat(sampleUrl, guide);
    expect(result.title).toBeUndefined();
  });

  it('should map content', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.content).toBe(sampleGuide.content);
  });

  it('should map authorName', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.authorName).toBe('旅行者');
  });

  it('should set authorName to undefined when missing', () => {
    const guide = { ...sampleGuide, author: undefined };
    const result = convertToConvexFormat(sampleUrl, guide);
    expect(result.authorName).toBeUndefined();
  });

  it('should parse views with Chinese number format', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.viewsCount).toBe(12000);
  });

  it('should parse likes', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.likesCount).toBe(300);
  });

  it('should set default 0 for savesCount and commentsCount', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.savesCount).toBe(0);
    expect(result.commentsCount).toBe(0);
  });

  it('should initialize destinations as empty array', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.destinations).toEqual([]);
  });

  it('should initialize tags as empty array', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.tags).toEqual([]);
  });

  it('should map coverImageUrl from coverImage', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.coverImageUrl).toBe('https://example.com/cover.jpg');
  });

  it('should fallback coverImageUrl to first image', () => {
    const guide = { ...sampleGuide, coverImage: undefined };
    const result = convertToConvexFormat(sampleUrl, guide);
    expect(result.coverImageUrl).toBe('img1.jpg');
  });

  it('should map imageUrls', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.imageUrls).toEqual(['img1.jpg', 'img2.jpg', 'img3.jpg']);
  });

  it('should calculate qualityScore', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(result.qualityScore).toBeGreaterThan(0);
    expect(result.qualityScore).toBeLessThanOrEqual(1);
  });

  it('should determine completenessLevel', () => {
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    expect(['complete', 'usable', 'incomplete']).toContain(
      result.completenessLevel,
    );
  });

  it('should set crawledAt to current timestamp', () => {
    const before = Date.now();
    const result = convertToConvexFormat(sampleUrl, sampleGuide);
    const after = Date.now();
    expect(result.crawledAt).toBeGreaterThanOrEqual(before);
    expect(result.crawledAt).toBeLessThanOrEqual(after);
  });

  it('should handle empty images array', () => {
    const guide = {
      ...sampleGuide,
      images: [] as string[],
      coverImage: undefined,
    };
    const result = convertToConvexFormat(sampleUrl, guide);
    expect(result.imageUrls).toEqual([]);
    expect(result.coverImageUrl).toBeUndefined();
  });
});
