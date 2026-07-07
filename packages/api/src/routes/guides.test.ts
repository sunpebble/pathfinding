import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithAuth, requestWithEnv } from '../test/helpers.js';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');

  return {
    ...actual,
    createDb: vi.fn(() => mockDb),
  };
});

function createSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where, limit });

  return { from, where, limit };
}

function createPaginatedSelectChain(result: unknown) {
  const offset = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ offset });
  const orderBy = vi.fn().mockReturnValue({ limit, offset });
  const where = vi.fn().mockReturnValue({ orderBy, limit, offset });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit, offset });

  return { from, where, orderBy, limit, offset };
}

function createGroupByChain(result: unknown) {
  const groupBy = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ groupBy });

  return { from, groupBy };
}

function createWhereSelectChain(result: unknown) {
  const where = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ where });

  return { from, where };
}

function createSearchSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy, limit });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit });

  return { from, where, orderBy, limit };
}

function createInsertReturningChain(id: number) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id }]),
    }),
  };
}

function createUpdateChain() {
  return { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) };
}

const guideMock = {
  id: 1,
  title: 'Paris Guide',
  platform: 'xiaohongshu',
  qualityScore: 0.9,
  viewCount: 100,
  likeCount: 50,
  createdAt: new Date(),
  authorName: 'User',
  content: '...',
  coverImageUrl: null,
  imageUrls: null,
  destinations: ['Paris'],
  enrichedData: null,
  dayItineraries: null,
  sourceUrl: null,
  tags: null,
  category: null,
};

const richGuideMock = {
  ...guideMock,
  sourceUrl: 'https://example.com/guide/1',
  externalId: 'mfw-1',
  commentCount: 7,
  updatedAt: new Date('2026-05-10T00:00:00.000Z'),
  tags: ['museum', 'family'],
  imageUrls: ['https://img.example.com/cover.jpg'],
  enrichedData: {
    contentHtml: '<p>富文本内容</p>',
    contentMarkdown: '## 富文本内容',
    aiSummary: '结构化摘要',
    aiTips: ['提前预约'],
    aiBestTime: '春秋',
    aiDuration: '2 days',
    aiBudget: '1000 CNY',
    aiDays: [{ day_number: 1, pois: [] }],
  },
};

describe('guides routes', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
  });

  describe('gET /api/guides', () => {
    it('returns guides list', async () => {
      const chain = createPaginatedSelectChain([guideMock]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/guides');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
    });

    it('filters by platform and min_quality', async () => {
      const chain = createPaginatedSelectChain([]);
      const countChain = createWhereSelectChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/guides?platform=xiaohongshu&min_quality=0.8');
      expect(response.status).toBe(200);
    });

    it('filters by max_quality for review queues', async () => {
      const chain = createPaginatedSelectChain([]);
      const countChain = createWhereSelectChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/guides?max_quality=0.5&sort=quality_score&order=asc');
      expect(response.status).toBe(200);
      expect(chain.where).toHaveBeenCalledWith(expect.anything());
      expect(countChain.where).toHaveBeenCalledWith(expect.anything());
    });

    it('returns the shared guide response contract for list results', async () => {
      const chain = createPaginatedSelectChain([richGuideMock]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/guides?limit=5&offset=10&sort=quality_score&order=asc');
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(chain.offset).toHaveBeenCalledWith(10);
      expect(body.pagination).toEqual({ limit: 5, offset: 10, total: 1 });
      expect(body.data[0]).toEqual(expect.objectContaining({
        id: '1',
        _id: '1',
        title: 'Paris Guide',
        source_platform: 'xiaohongshu',
        source_url: 'https://example.com/guide/1',
        content_html: '<p>富文本内容</p>',
        content_markdown: '## 富文本内容',
        comments_count: 7,
        tags: ['museum', 'family'],
        image_urls: ['https://img.example.com/cover.jpg'],
        updated_at: '2026-05-10T00:00:00.000Z',
        ai_summary: '结构化摘要',
        ai_tips: ['提前预约'],
        ai_best_time: '春秋',
        ai_duration: '2 days',
        ai_budget: '1000 CNY',
        ai_days: [{ day_number: 1, pois: [] }],
      }));
    });

    it('normalizes DB day itineraries into the shared ai_days contract', async () => {
      const chain = createPaginatedSelectChain([{
        ...richGuideMock,
        enrichedData: {
          contentHtml: '<p>富文本内容</p>',
        },
        dayItineraries: [{ day: 1, title: 'Day 1', pois: [] }],
      }]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/guides');
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data[0].ai_days).toEqual([{ day_number: 1, title: 'Day 1', pois: [] }]);
      expect(body.data[0].ai_days[0]).not.toHaveProperty('day');
    });

    it('normalizes enriched dayNumber AI days with default pois', async () => {
      const chain = createPaginatedSelectChain([{
        ...richGuideMock,
        enrichedData: {
          aiDays: [{ dayNumber: 2 }],
        },
      }]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/guides');
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data[0].ai_days).toEqual([{ day_number: 2, pois: [] }]);
      expect(body.data[0].ai_days[0]).not.toHaveProperty('dayNumber');
    });

    it('returns saves_count as null instead of a fake 0 (D13)', async () => {
      // Arrange
      const chain = createPaginatedSelectChain([richGuideMock]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      // Act
      const response = await requestWithEnv(createApp(), '/api/guides');

      // Assert
      const body = await response.json();
      expect(body.data[0].saves_count).toBeNull();
    });

    it('filters by q on guide titles', async () => {
      // Arrange
      const chain = createPaginatedSelectChain([guideMock]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      // Act
      const response = await requestWithEnv(createApp(), '/api/guides?q=Paris');

      // Assert
      expect(response.status).toBe(200);
      expect(chain.where).toHaveBeenCalledWith(expect.anything());
    });

    it('filters by destinations via the guide_destinations auxiliary table', async () => {
      // Arrange: first select resolves auxiliary-table guide IDs, then list+count.
      const destWhere = vi.fn().mockResolvedValue([{ guideId: 1 }, { guideId: 1 }]);
      const destChain = { from: vi.fn().mockReturnValue({ where: destWhere }) };
      const chain = createPaginatedSelectChain([guideMock]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(destChain)
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      // Act
      const response = await requestWithEnv(createApp(), '/api/guides?destinations=Paris,%20London');

      // Assert
      expect(response.status).toBe(200);
      expect(destWhere).toHaveBeenCalledWith(expect.anything());
      const body = await response.json();
      expect(body.data).toHaveLength(1);
    });

    it('returns an empty list when no guide covers the requested destinations', async () => {
      // Arrange: the auxiliary table has no match — must NOT silently drop the filter.
      const destWhere = vi.fn().mockResolvedValue([]);
      const destChain = { from: vi.fn().mockReturnValue({ where: destWhere }) };
      mockDb.select.mockReturnValueOnce(destChain);

      // Act
      const response = await requestWithEnv(createApp(), '/api/guides?destinations=Atlantis');

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
      // Only the auxiliary lookup ran; no unfiltered full-table query.
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });

    it('keeps ai_processed_at null for current iOS compatibility', async () => {
      const chain = createPaginatedSelectChain([{
        ...richGuideMock,
        enrichedData: {
          ...richGuideMock.enrichedData,
          aiProcessedAt: '2026-05-10T00:00:00.000Z',
        },
      }]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/guides');
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.data[0].ai_processed_at).toBeNull();
    });
  });

  describe('gET /api/guides/search', () => {
    it('searches by query', async () => {
      const chain = createSearchSelectChain([guideMock]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/guides/search?q=paris');
      expect(response.status).toBe(200);
    });

    it('searches by destination', async () => {
      const chain = createSearchSelectChain([guideMock]);
      const countChain = createWhereSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/guides/search?destination=Paris');
      expect(response.status).toBe(200);
    });

    it('returns guides when no params', async () => {
      const chain = createSearchSelectChain([]);
      const countChain = createWhereSelectChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(countChain);

      const response = await requestWithEnv(createApp(), '/api/guides/search');
      expect(response.status).toBe(200);
    });
  });

  describe('gET /api/guides/destinations', () => {
    it('returns popular destinations', async () => {
      const chain = createSelectChain([
        { destinations: ['Paris', 'London', 'Paris'] },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithEnv(createApp(), '/api/guides/destinations');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });
  });

  describe('gET /api/guides/by-id', () => {
    it('returns guide by ID', async () => {
      const chain = createSelectChain([guideMock]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithEnv(createApp(), '/api/guides/by-id?id=1');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.title).toBe('Paris Guide');
    });

    it('returns structured content fields from enriched data', async () => {
      const chain = createSelectChain([{
        ...guideMock,
        enrichedData: {
          contentHtml: '<p>富文本内容</p>',
          contentMarkdown: '## 富文本内容',
          aiSummary: '结构化摘要',
          aiTips: ['提前预约'],
        },
      }]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithEnv(createApp(), '/api/guides/by-id?id=1');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.content_html).toBe('<p>富文本内容</p>');
      expect(body.content_markdown).toBe('## 富文本内容');
      expect(body.ai_summary).toBe('结构化摘要');
      expect(body.ai_tips).toEqual(['提前预约']);
    });

    it('returns 400 when id is missing', async () => {
      const response = await requestWithEnv(createApp(), '/api/guides/by-id');
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent guide', async () => {
      const chain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithEnv(createApp(), '/api/guides/by-id?id=999');
      expect(response.status).toBe(404);
    });
  });

  describe('gET /api/guides/stats', () => {
    it('returns stats', async () => {
      const chain = createGroupByChain([
        { platform: 'xiaohongshu', count: 10 },
        { platform: 'douyin', count: 5 },
      ]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithEnv(createApp(), '/api/guides/stats');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.total).toBe(15);
      expect(body.by_platform).toBeDefined();
    });
  });

  describe('gET /api/guides/:id', () => {
    it('returns guide by path param', async () => {
      const chain = createSelectChain([guideMock]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithEnv(createApp(), '/api/guides/1');
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
    });

    it('returns 400 for invalid ID', async () => {
      const response = await requestWithEnv(createApp(), '/api/guides/abc');
      expect(response.status).toBe(400);
    });

    it('returns 404 for non-existent guide', async () => {
      const chain = createSelectChain([]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithEnv(createApp(), '/api/guides/999');
      expect(response.status).toBe(404);
    });
  });

  describe('pOST /api/guides', () => {
    it('creates a guide', async () => {
      mockDb.insert.mockReturnValueOnce(createInsertReturningChain(10));

      const response = await requestWithAuth(createApp(), '/api/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'xiaohongshu', title: 'New Guide' }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.id).toBe(10);
    });
  });

  describe('pATCH /api/guides/:id', () => {
    it('updates a guide', async () => {
      mockDb.update.mockReturnValueOnce(createUpdateChain());

      const response = await requestWithAuth(createApp(), '/api/guides/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Guide' }),
      });

      expect(response.status).toBe(200);
    });

    it('returns 400 when no fields to update', async () => {
      const response = await requestWithAuth(createApp(), '/api/guides/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('pATCH /api/guides/:id/poi-coordinates', () => {
    it('returns 404 when day itinerary not found', async () => {
      const chain = createSelectChain([{ ...guideMock, dayItineraries: [] }]);
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/guides/1/poi-coordinates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayNumber: 1, poiIndex: 0, latitude: 1, longitude: 1 }),
      });

      expect(response.status).toBe(404);
    });

    it('writes manual corrections into enrichedData.aiDays and re-derives dayItineraries (D13)', async () => {
      // Arrange: a guide whose read path is served from enrichedData.aiDays.
      const guideWithAiDays = {
        ...guideMock,
        enrichedData: {
          aiSummary: '摘要',
          aiDays: [
            {
              dayNumber: 1,
              theme: '老城区',
              pois: [
                {
                  name: '宽窄巷子',
                  type: 'attraction',
                  latitude: 30.1,
                  longitude: 104.1,
                  geocodeConfidence: 0.4,
                  geocodeSource: 'amap',
                },
                { name: '未解析点' },
              ],
            },
          ],
        },
        dayItineraries: [
          { day: 1, title: '老城区', pois: [{ name: '宽窄巷子', lat: 30.1, lng: 104.1 }] },
        ],
      };
      mockDb.select.mockReturnValueOnce(createSelectChain([guideWithAiDays]));
      const updateChain = createUpdateChain();
      mockDb.update.mockReturnValueOnce(updateChain);

      // Act
      const response = await requestWithAuth(createApp(), '/api/guides/1/poi-coordinates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayNumber: 1,
          poiIndex: 0,
          latitude: 30.6624,
          longitude: 104.0633,
          verifiedBy: 'admin',
        }),
      });

      // Assert
      expect(response.status).toBe(200);
      const updates = updateChain.set.mock.calls[0]![0] as {
        enrichedData: Record<string, unknown>;
        dayItineraries: Array<{ day: number; title?: string; pois: unknown[] }>;
      };
      const aiDays = updates.enrichedData.aiDays as Array<{ pois: Array<Record<string, unknown>> }>;
      expect(aiDays[0]!.pois[0]).toMatchObject({
        name: '宽窄巷子',
        latitude: 30.6624,
        longitude: 104.0633,
        geocodeConfidence: 1,
        geocodeSource: 'manual',
        isManuallyVerified: true,
        verifiedBy: 'admin',
      });
      // Other AI keys survive the merge.
      expect(updates.enrichedData.aiSummary).toBe('摘要');
      // dayItineraries is re-derived from aiDays — only resolved POIs, lat/lng shape.
      expect(updates.dayItineraries).toEqual([
        {
          day: 1,
          title: '老城区',
          pois: [{ name: '宽窄巷子', lat: 30.6624, lng: 104.0633, category: 'attraction' }],
        },
      ]);
    });

    it('returns 404 when the aiDays poi index does not exist', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{
        ...guideMock,
        enrichedData: { aiDays: [{ dayNumber: 1, pois: [] }] },
      }]));

      const response = await requestWithAuth(createApp(), '/api/guides/1/poi-coordinates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayNumber: 1, poiIndex: 0, latitude: 1, longitude: 1 }),
      });

      expect(response.status).toBe(404);
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('gET /api/guides/gap-report', () => {
    it('returns gap summary with the real total guide count', async () => {
      // Arrange: the five db.select calls behind runFullAnalysis —
      // ranked field gaps → field summary → covered subquery → gap list → gap count.
      const rankedGapChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                guideId: 1,
                title: 'Test',
                platform: 'xiaohongshu',
                missingCount: 7,
                content: 1,
                imageUrls: 1,
                destinations: 1,
                dayItineraries: 1,
                geoData: 1,
                enrichedData: 1,
                coverImageUrl: 1,
              }]),
            }),
          }),
        }),
      };
      const summaryChain = {
        from: vi.fn().mockResolvedValue([{
          totalGuides: 5,
          guidesWithGaps: 1,
          content: 1,
          imageUrls: 1,
          destinations: 1,
          dayItineraries: 1,
          geoData: 1,
          enrichedData: 1,
          coverImageUrl: 1,
        }]),
      };
      const subqueryChain = {
        from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({}) }),
      };
      const gapListChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ cityName: 'Chengdu', countryCode: 'CN' }]),
            }),
          }),
        }),
      };
      const gapCountChain = {
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ total: 1 }]) }),
      };
      mockDb.select
        .mockReturnValueOnce(rankedGapChain)
        .mockReturnValueOnce(summaryChain)
        .mockReturnValueOnce(subqueryChain)
        .mockReturnValueOnce(gapListChain)
        .mockReturnValueOnce(gapCountChain);

      // Act
      const response = await requestWithEnv(createApp(), '/api/guides/gap-report');

      // Assert
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.totalGuides).toBe(5);
      expect(body.data.fieldGapCount).toBe(1);
      expect(body.data.destinationGapCount).toBe(1);
    });
  });
});
