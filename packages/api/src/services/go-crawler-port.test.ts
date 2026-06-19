import { describe, expect, it } from 'vitest';
import { decodeDetailResponse, RawCrawlDetailSchema } from './go-crawler-port.js';

const GO_DETAIL_KEYS = [
  'url',
  'externalId',
  'title',
  'content',
  'contentHtml',
  'contentMarkdown',
  'contentTruncated',
  'author',
  'views',
  'likes',
  'viewsRaw',
  'likesRaw',
  'coverImage',
  'images',
  'publishedAt',
  'qualityScore',
  'saved',
  'saveError',
];

function goDetailPayload(overrides: Record<string, unknown> = {}) {
  return {
    url: 'https://example.com/1',
    externalId: 'mg1',
    title: '北京',
    content: '正文',
    contentHtml: '<p>h</p>',
    contentMarkdown: '# md',
    contentTruncated: false,
    author: '作者',
    views: 100,
    likes: 50,
    viewsRaw: '100',
    likesRaw: '50',
    coverImage: 'https://img/c.jpg',
    images: ['https://img/1.jpg'],
    publishedAt: '2023-08-12',
    qualityScore: 0.85,
    saved: true,
    saveError: '',
    ...overrides,
  };
}

describe('rawCrawlDetailSchema', () => {
  it('accepts a full Go /detail payload', () => {
    expect(RawCrawlDetailSchema.parse(goDetailPayload())).toMatchObject({ externalId: 'mg1', views: 100 });
  });

  it('accepts null counts (D4) and string legacy counts', () => {
    expect(RawCrawlDetailSchema.parse(goDetailPayload({ views: null, likes: '1.2万' }))).toMatchObject({
      views: null,
      likes: '1.2万',
    });
  });

  it('rejects a payload missing a required key (contract drift guard)', () => {
    const { externalId: _omit, ...broken } = goDetailPayload();
    expect(() => RawCrawlDetailSchema.parse(broken)).toThrow();
  });

  it('contract parity: schema keys equal the Go /detail key set', () => {
    expect(Object.keys(RawCrawlDetailSchema.shape).sort()).toEqual([...GO_DETAIL_KEYS].sort());
  });
});

describe('decodeDetailResponse', () => {
  it('returns ok with data for a valid response', () => {
    const result = decodeDetailResponse({ success: true, data: goDetailPayload() });
    expect(result).toMatchObject({ ok: true });
  });

  it('returns not-ok for an error envelope', () => {
    const result = decodeDetailResponse({ success: false, error: '解析失败' });
    expect(result).toEqual({ ok: false, error: '解析失败' });
  });

  it('returns not-ok when the payload fails validation', () => {
    const result = decodeDetailResponse({ success: true, data: { url: 'x' } });
    expect(result.ok).toBe(false);
  });
});
