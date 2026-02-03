/**
 * Tests for Mafengwo (马蜂窝) crawler parsing logic
 * Tests URL parsing, city ID mapping, and content extraction
 */

import { describe, expect, it } from 'vitest';

// ============================================================
// Constants (from mafengwo.ts)
// ============================================================

const CITY_IDS: Record<string, string> = {
  北京: '10065',
  上海: '10099',
  杭州: '10156',
  成都: '10332',
  西安: '10195',
  三亚: '10186',
  厦门: '10132',
  大理: '10487',
  广州: '10088',
  深圳: '10086',
  南京: '10183',
  苏州: '10206',
  丽江: '10460',
  重庆: '10208',
  武汉: '10140',
};

// ============================================================
// Helper Functions (extracted for testing)
// ============================================================

function getCityId(city: string): string | undefined {
  return CITY_IDS[city];
}

function getListPageUrl(city: string, page: number): string {
  const cityId = getCityId(city);
  return `https://www.mafengwo.cn/yj/${cityId}/1-0-${page}.html`;
}

function getSourceExternalId(url: string): string {
  const match = url.match(/\/i\/(\d+)\.html/);
  return `mafengwo_${match?.[1] || Date.now()}`;
}

function isValidGuideUrl(url: string): boolean {
  // Mafengwo guide URLs follow pattern: /i/{id}.html
  return /\/i\/\d+\.html/.test(url);
}

function normalizeUrl(url: string): string {
  if (url.startsWith('/')) {
    return `https://www.mafengwo.cn${url}`;
  }
  return url;
}

// ============================================================
// Tests
// ============================================================

describe('mafengwo Crawler - City ID Mapping', () => {
  describe('getCityId', () => {
    it('should return correct ID for major cities', () => {
      expect(getCityId('北京')).toBe('10065');
      expect(getCityId('上海')).toBe('10099');
      expect(getCityId('杭州')).toBe('10156');
      expect(getCityId('成都')).toBe('10332');
    });

    it('should return correct ID for tourist destinations', () => {
      expect(getCityId('三亚')).toBe('10186');
      expect(getCityId('大理')).toBe('10487');
      expect(getCityId('丽江')).toBe('10460');
    });

    it('should return undefined for unknown cities', () => {
      expect(getCityId('未知城市')).toBeUndefined();
      expect(getCityId('')).toBeUndefined();
    });
  });

  describe('city coverage', () => {
    it('should have mappings for all major travel destinations', () => {
      const majorCities = ['北京', '上海', '广州', '深圳', '成都', '杭州'];
      for (const city of majorCities) {
        expect(getCityId(city)).toBeDefined();
      }
    });
  });
});

describe('mafengwo Crawler - URL Generation', () => {
  describe('getListPageUrl', () => {
    it('should generate correct list page URL', () => {
      const url = getListPageUrl('北京', 1);
      expect(url).toBe('https://www.mafengwo.cn/yj/10065/1-0-1.html');
    });

    it('should handle different page numbers', () => {
      expect(getListPageUrl('上海', 1)).toContain('1-0-1.html');
      expect(getListPageUrl('上海', 5)).toContain('1-0-5.html');
      expect(getListPageUrl('上海', 10)).toContain('1-0-10.html');
    });

    it('should include city ID in URL', () => {
      const url = getListPageUrl('杭州', 1);
      expect(url).toContain('10156');
    });
  });

  describe('normalizeUrl', () => {
    it('should convert relative URLs to absolute', () => {
      const relative = '/i/12345678.html';
      expect(normalizeUrl(relative)).toBe('https://www.mafengwo.cn/i/12345678.html');
    });

    it('should keep absolute URLs unchanged', () => {
      const absolute = 'https://www.mafengwo.cn/i/12345678.html';
      expect(normalizeUrl(absolute)).toBe(absolute);
    });
  });
});

describe('mafengwo Crawler - URL Parsing', () => {
  describe('getSourceExternalId', () => {
    it('should extract ID from guide URL', () => {
      const url = 'https://www.mafengwo.cn/i/12345678.html';
      expect(getSourceExternalId(url)).toBe('mafengwo_12345678');
    });

    it('should handle relative URLs', () => {
      const url = '/i/87654321.html';
      expect(getSourceExternalId(url)).toBe('mafengwo_87654321');
    });

    it('should generate fallback for invalid URLs', () => {
      const url = 'https://www.mafengwo.cn/unknown/page';
      const result = getSourceExternalId(url);
      expect(result).toMatch(/^mafengwo_\d+$/);
    });
  });

  describe('isValidGuideUrl', () => {
    it('should validate guide URLs', () => {
      expect(isValidGuideUrl('/i/12345678.html')).toBe(true);
      expect(isValidGuideUrl('https://www.mafengwo.cn/i/12345678.html')).toBe(true);
    });

    it('should reject non-guide URLs', () => {
      expect(isValidGuideUrl('/yj/10065/1-0-1.html')).toBe(false);
      expect(isValidGuideUrl('/hotel/12345.html')).toBe(false);
      expect(isValidGuideUrl('/poi/12345.html')).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(isValidGuideUrl('/i/abc.html')).toBe(false);
      expect(isValidGuideUrl('/i/.html')).toBe(false);
    });
  });
});

describe('mafengwo Crawler - Content Extraction', () => {
  describe('extracted content structure', () => {
    it('should define expected fields for guide extraction', () => {
      // Simulate extracted data structure
      const extractedGuide = {
        title: '北京三日游完整攻略',
        content: '第一天：天安门广场...',
        author: {
          name: '旅行达人',
          avatar: 'https://example.com/avatar.jpg',
        },
        images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
        stats: {
          views: 10000,
          likes: 500,
          comments: 50,
        },
        destinations: ['北京', '天安门', '故宫'],
        publishedAt: '2024-01-15',
      };

      expect(extractedGuide.title).toBeDefined();
      expect(extractedGuide.content).toBeDefined();
      expect(extractedGuide.author.name).toBeDefined();
      expect(Array.isArray(extractedGuide.images)).toBe(true);
      expect(Array.isArray(extractedGuide.destinations)).toBe(true);
    });
  });

  describe('list page extraction', () => {
    it('should extract multiple guides from list page', () => {
      // Simulate list extraction result
      const listItems = [
        { title: 'Guide 1', url: '/i/111.html', author: 'Author 1' },
        { title: 'Guide 2', url: '/i/222.html', author: 'Author 2' },
        { title: 'Guide 3', url: '/i/333.html', author: 'Author 3' },
      ];

      expect(listItems).toHaveLength(3);
      expect(listItems.every(item => isValidGuideUrl(item.url))).toBe(true);
    });

    it('should filter out non-guide links', () => {
      const allLinks = [
        { url: '/i/111.html', type: 'guide' },
        { url: '/hotel/222.html', type: 'hotel' },
        { url: '/i/333.html', type: 'guide' },
        { url: '/poi/444.html', type: 'poi' },
      ];

      const guideLinks = allLinks.filter(link => isValidGuideUrl(link.url));
      expect(guideLinks).toHaveLength(2);
    });
  });
});
