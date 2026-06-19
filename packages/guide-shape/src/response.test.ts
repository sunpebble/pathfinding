import { describe, expect, it } from 'vitest';
import { toResponseDto } from './response';

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    platform: 'mafengwo',
    externalId: 'mg7',
    title: '北京攻略',
    content: '正文',
    authorName: '作者',
    authorUrl: null,
    publishedAt: new Date('2023-08-12T00:00:00Z'),
    sourceUrl: 'https://example.com/7',
    coverImageUrl: 'https://img/cover.jpg',
    imageUrls: ['https://img/1.jpg'],
    destinations: [{ name: '北京' }],
    tags: ['city'],
    category: null,
    viewCount: 100,
    likeCount: 50,
    commentCount: 3,
    qualityScore: 0.8,
    completenessScore: null,
    completenessLevel: 'usable',
    enrichedData: {
      aiSummary: '一句话',
      aiDays: [{ day_number: 1, pois: [{ name: 'A', latitude: 39.9, longitude: 116.4 }] }],
    },
    geoData: null,
    dayItineraries: null,
    crawledAt: new Date('2023-08-13T00:00:00Z'),
    lastUpdatedAt: null,
    createdAt: new Date('2023-08-13T00:00:00Z'),
    updatedAt: new Date('2023-08-13T00:00:00Z'),
    ...overrides,
  } as never;
}

describe('toResponseDto', () => {
  it('maps a DB row to the iOS-compatible snake_case DTO', () => {
    const dto = toResponseDto(baseRow());

    expect(dto.id).toBe('7');
    expect(dto._id).toBe('7');
    expect(dto.source_platform).toBe('mafengwo');
    expect(dto.views_count).toBe(100);
    expect(dto.likes_count).toBe(50);
    expect(dto.comments_count).toBe(3);
    expect(dto.destinations).toEqual(['北京']);
    expect(dto.ai_summary).toBe('一句话');
    expect(dto.ai_days).toEqual([{ day_number: 1, pois: [{ name: 'A', latitude: 39.9, longitude: 116.4 }] }]);
  });

  it('never fabricates saves_count — always null (D13)', () => {
    expect(toResponseDto(baseRow()).saves_count).toBeNull();
  });

  it('falls back to dayItineraries for ai_days when enrichedData has none', () => {
    const dto = toResponseDto(baseRow({ enrichedData: {}, dayItineraries: [{ day: 2, pois: [] }] }));

    expect(dto.ai_days).toEqual([{ day_number: 2, pois: [] }]);
  });
});
