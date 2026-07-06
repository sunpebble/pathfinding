import type { RawCrawlDetail } from './guide-normalize.js';
import { describe, expect, it } from 'vitest';
import { normalizeGuide } from './guide-normalize.js';

const FIXED = new Date('2026-06-19T00:00:00Z');
const LONG = '第一天到达北京，入住酒店后去了天安门广场看升旗仪式，随后步行到王府井吃晚饭。'.repeat(8);

function detail(overrides: Partial<RawCrawlDetail> = {}): RawCrawlDetail {
  return {
    url: 'https://example.com/1',
    externalId: 'mg1',
    title: '北京超全攻略',
    content: LONG,
    author: '作者',
    views: 100,
    likes: 50,
    viewsRaw: '100',
    likesRaw: '50',
    coverImage: 'https://img/c.jpg',
    images: ['https://img/1.jpg'],
    publishedAt: '2023-08-12',
    ...overrides,
  } as RawCrawlDetail;
}

describe('normalizeGuide', () => {
  it('produces an accepted CanonicalGuide for a valid detail (golden, no IO)', () => {
    const result = normalizeGuide(detail(), 'https://example.com/1', { city: '北京', cityScoped: true, jobId: 5 }, null, () => FIXED);

    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') {
      return;
    }
    expect(result.guide.platform).toBe('mafengwo');
    expect(result.guide.externalId).toBe('mg1');
    expect(result.guide.values.viewCount).toBe(100);
    expect(result.guide.values.likeCount).toBe(50);
    expect(result.guide.values.sourceUrl).toBe('https://example.com/1');
    expect(result.guide.destinationNames).toEqual(['北京']);
    expect(result.guide.values.crawledAt).toBe(FIXED);
    expect(result.guide.values.lastUpdatedAt).toBe(FIXED);
    expect(result.audit.jobId).toBe(5);
    expect(result.audit.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns null counts + a warning when both parsed and raw fail (D4, never fake 0)', () => {
    const result = normalizeGuide(detail({ views: null, viewsRaw: '' }), 'https://example.com/1', { city: '北京', cityScoped: true }, null, () => FIXED);

    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') {
      return;
    }
    expect(result.guide.views).toBeNull();
    expect(result.guide.values.viewCount).toBe(0);
    expect(result.warnings.some(w => w.includes('views'))).toBe(true);
  });

  it('rejects empty destinations (faithful to the original validation.valid gate), carrying audit (D6)', () => {
    const result = normalizeGuide(detail(), 'https://example.com/1', undefined, null, () => FIXED);

    expect(result.status).toBe('rejected');
    if (result.status !== 'rejected') {
      return;
    }
    expect(result.reason).toContain('destinations');
    expect(result.audit.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects empty content (content required), carrying audit', () => {
    const result = normalizeGuide(detail({ content: '' }), 'https://example.com/1', { city: '北京', cityScoped: true }, null, () => FIXED);

    expect(result.status).toBe('rejected');
    if (result.status !== 'rejected') {
      return;
    }
    expect(result.reason).toContain('content');
  });

  it('only attributes the request city when cityScoped is strictly true (D10)', () => {
    const result = normalizeGuide(detail(), 'https://example.com/1', { city: '北京', cityScoped: false }, { destinationName: '上海' }, () => FIXED);

    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') {
      return;
    }
    expect(result.guide.destinationNames).toEqual(['上海']);
  });
});
