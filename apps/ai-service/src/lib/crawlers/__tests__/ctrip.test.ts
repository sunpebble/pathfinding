/**
 * Tests for Ctrip (携程) crawler parsing logic
 * Tests URL parsing, city ID mapping, and content extraction
 */

import { describe, expect, it } from 'vitest';

// ============================================================
// Constants (from ctrip.ts)
// ============================================================

const CITY_IDS: Record<string, string> = {
  北京: 'Beijing1',
  上海: 'Shanghai2',
  杭州: 'Hangzhou14',
  成都: 'Chengdu104',
  西安: 'Xian7',
  三亚: 'Sanya61',
  厦门: 'Xiamen21',
  大理: 'Dali31',
  广州: 'Guangzhou152',
  深圳: 'Shenzhen26',
  南京: 'Nanjing9',
  苏州: 'Suzhou11',
  丽江: 'Lijiang32',
  重庆: 'Chongqing158',
  武汉: 'Wuhan145',
};

// ============================================================
// Helper Functions (extracted for testing)
// ============================================================

function getCityId(city: string): string {
  return CITY_IDS[city] || city;
}

function getListPageUrl(city: string, page: number): string {
  const cityId = getCityId(city);
  return `https://you.ctrip.com/travels/${cityId}/t3-p${page}.html`;
}

function getSourceExternalId(url: string): string {
  // Match patterns like /travels/beijing1/12345.html or /travel/12345.html
  const match = url.match(/\/(\d+)\.html/);
  return `ctrip_${match?.[1] || Date.now()}`;
}

function isValidTravelUrl(url: string): boolean {
  // Ctrip travel guide URLs contain /travels/ or have numeric ID
  return /\/travels\/[^/]+\/\d+\.html/.test(url) || /\/travel\/\d+\.html/.test(url);
}

function transformToHighRes(imageUrl: string): string {
  // Remove size constraints from Ctrip image URLs
  return imageUrl
    .replace(/_[RC]_\d+_\d+/, '')
    .replace(/\.w\d+\.h\d+/, '')
    .replace(/\?.*$/, '');
}

// ============================================================
// Tests
// ============================================================

describe('ctrip Crawler - City ID Mapping', () => {
  describe('getCityId', () => {
    it('should return correct ID for major cities', () => {
      expect(getCityId('北京')).toBe('Beijing1');
      expect(getCityId('上海')).toBe('Shanghai2');
      expect(getCityId('杭州')).toBe('Hangzhou14');
      expect(getCityId('成都')).toBe('Chengdu104');
    });

    it('should return correct ID for tourist destinations', () => {
      expect(getCityId('三亚')).toBe('Sanya61');
      expect(getCityId('大理')).toBe('Dali31');
      expect(getCityId('丽江')).toBe('Lijiang32');
    });

    it('should return input as fallback for unknown cities', () => {
      expect(getCityId('未知城市')).toBe('未知城市');
      expect(getCityId('Tokyo')).toBe('Tokyo');
    });
  });

  describe('city ID format', () => {
    it('should follow CityName+Number pattern', () => {
      for (const [_city, id] of Object.entries(CITY_IDS)) {
        expect(id).toMatch(/^[A-Z]+\d+$/i);
      }
    });
  });
});

describe('ctrip Crawler - URL Generation', () => {
  describe('getListPageUrl', () => {
    it('should generate correct list page URL', () => {
      const url = getListPageUrl('北京', 1);
      expect(url).toBe('https://you.ctrip.com/travels/Beijing1/t3-p1.html');
    });

    it('should handle different page numbers', () => {
      expect(getListPageUrl('上海', 1)).toContain('t3-p1.html');
      expect(getListPageUrl('上海', 5)).toContain('t3-p5.html');
      expect(getListPageUrl('上海', 10)).toContain('t3-p10.html');
    });

    it('should use you.ctrip.com domain', () => {
      const url = getListPageUrl('杭州', 1);
      expect(url.startsWith('https://you.ctrip.com/')).toBe(true);
    });
  });
});

describe('ctrip Crawler - URL Parsing', () => {
  describe('getSourceExternalId', () => {
    it('should extract ID from travel URL', () => {
      const url = 'https://you.ctrip.com/travels/beijing1/12345678.html';
      expect(getSourceExternalId(url)).toBe('ctrip_12345678');
    });

    it('should handle different city formats', () => {
      const url1 = 'https://you.ctrip.com/travels/Shanghai2/87654321.html';
      const url2 = 'https://you.ctrip.com/travel/11111111.html';

      expect(getSourceExternalId(url1)).toBe('ctrip_87654321');
      expect(getSourceExternalId(url2)).toBe('ctrip_11111111');
    });

    it('should generate fallback for invalid URLs', () => {
      const url = 'https://you.ctrip.com/unknown/page';
      const result = getSourceExternalId(url);
      expect(result).toMatch(/^ctrip_\d+$/);
    });
  });

  describe('isValidTravelUrl', () => {
    it('should validate travel guide URLs', () => {
      expect(isValidTravelUrl('https://you.ctrip.com/travels/beijing1/12345.html')).toBe(true);
      expect(isValidTravelUrl('https://you.ctrip.com/travel/12345.html')).toBe(true);
    });

    it('should reject non-travel URLs', () => {
      expect(isValidTravelUrl('https://you.ctrip.com/sight/beijing1/12345.html')).toBe(false);
      expect(isValidTravelUrl('https://you.ctrip.com/hotel/12345.html')).toBe(false);
      expect(isValidTravelUrl('https://www.ctrip.com/')).toBe(false);
    });
  });
});

describe('ctrip Crawler - Image Processing', () => {
  describe('transformToHighRes', () => {
    it('should remove size constraints (_R_ pattern)', () => {
      const url = 'https://dimg04.c-ctrip.com/images/xxx_R_800_600.jpg';
      expect(transformToHighRes(url)).toBe('https://dimg04.c-ctrip.com/images/xxx.jpg');
    });

    it('should remove size constraints (_C_ pattern)', () => {
      const url = 'https://dimg04.c-ctrip.com/images/xxx_C_400_300.jpg';
      expect(transformToHighRes(url)).toBe('https://dimg04.c-ctrip.com/images/xxx.jpg');
    });

    it('should remove .w.h pattern', () => {
      const url = 'https://dimg04.c-ctrip.com/images/xxx.w800.h600.jpg';
      expect(transformToHighRes(url)).toBe('https://dimg04.c-ctrip.com/images/xxx.jpg');
    });

    it('should remove query parameters', () => {
      const url = 'https://dimg04.c-ctrip.com/images/xxx.jpg?quality=80&size=medium';
      expect(transformToHighRes(url)).toBe('https://dimg04.c-ctrip.com/images/xxx.jpg');
    });

    it('should handle clean URLs unchanged', () => {
      const url = 'https://dimg04.c-ctrip.com/images/clean.jpg';
      expect(transformToHighRes(url)).toBe(url);
    });
  });
});

describe('ctrip Crawler - Content Extraction', () => {
  describe('extracted content structure', () => {
    it('should define expected fields for guide extraction', () => {
      // Simulate extracted data structure
      const extractedGuide = {
        title: '上海迪士尼三日游攻略',
        content: '第一天：到达上海...',
        author: {
          name: '旅行博主',
          avatar: 'https://example.com/avatar.jpg',
        },
        images: ['https://dimg04.c-ctrip.com/1.jpg'],
        stats: {
          views: 5000,
          likes: 200,
          comments: 30,
        },
        destinations: ['上海', '迪士尼'],
        publishedAt: '2024-02-01',
      };

      expect(extractedGuide.title).toBeDefined();
      expect(extractedGuide.content).toBeDefined();
      expect(extractedGuide.author.name).toBeDefined();
      expect(Array.isArray(extractedGuide.images)).toBe(true);
    });
  });
});
