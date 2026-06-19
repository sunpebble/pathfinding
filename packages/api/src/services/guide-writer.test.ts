import type { NormalizeResult } from './guide-normalize.js';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyPoiCoordinateFix, createUserGuide, persistIngestedGuide, updateUserGuide } from './guide-writer.js';

vi.mock('@pathfinding/database', () => ({
  getDb: vi.fn(),
  travelGuides: 'travel_guides',
  guideDestinations: 'guide_destinations',
  rawCrawlRecords: 'raw_crawl_records',
}));

interface CapturedWrite { table: unknown; values: Record<string, unknown> }

function createMockDb(state: { travelGuides?: Array<Record<string, unknown>>; guideDestinations?: Array<Record<string, unknown>> } = {}) {
  const inserts: CapturedWrite[] = [];
  const updates: CapturedWrite[] = [];
  function rowsFor(table: unknown) {
    if (table === 'travel_guides')
      return state.travelGuides ?? [];
    if (table === 'guide_destinations')
      return state.guideDestinations ?? [];
    return [];
  }
  const db = {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        const rows = rowsFor(table);
        const thenable = { limit: vi.fn().mockResolvedValue(rows), then: (r: (v: unknown) => unknown) => Promise.resolve(rows).then(r) };
        return { where: vi.fn(() => thenable), limit: vi.fn().mockResolvedValue(rows) };
      }),
    })),
    // values() returns a thenable array (awaited by persistIngestedGuide → insertResult[0].insertId)
    // that ALSO exposes $returningId() (used by createUserGuide → [{ id }]) so the one mock covers both writers.
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: Record<string, unknown>) => {
        inserts.push({ table, values });
        return Object.assign(Promise.resolve([{ insertId: 999 }]), {
          $returningId: () => Promise.resolve([{ id: 999 }]),
        });
      }),
    })),
    update: vi.fn((table: unknown) => ({ set: vi.fn((values: Record<string, unknown>) => ({ where: vi.fn(async () => { updates.push({ table, values }); }) })) })),
  };
  return { db: db as never, inserts, updates };
}

function accepted(overrides: Record<string, unknown> = {}): NormalizeResult {
  return {
    status: 'accepted',
    warnings: [],
    audit: { jobId: 0, rawData: {}, contentHash: 'a'.repeat(64) },
    guide: {
      platform: 'mafengwo',
      externalId: 'mg1',
      values: { title: '北京', content: 'x'.repeat(600), viewCount: 1, likeCount: 1, commentCount: 0, crawledAt: new Date(), destinations: [{ name: '北京' }] },
      destinationNames: ['北京'],
      views: 1,
      likes: 1,
      commentCount: 0,
      cleanedContent: 'x'.repeat(600),
      enrichedNew: { contentHtml: '<p>x</p>' },
      ...overrides,
    },
  } as NormalizeResult;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('persistIngestedGuide', () => {
  it('inserts a new guide, mirrors destinations, and writes a success raw record', async () => {
    const mock = createMockDb({ travelGuides: [] });
    const result = await persistIngestedGuide(mock.db, accepted());

    expect(result.action).toBe('inserted');
    expect(result.guideId).toBe(999);
    expect(mock.inserts.some(w => w.table === 'travel_guides')).toBe(true);
    expect(mock.inserts.some(w => w.table === 'guide_destinations')).toBe(true);
    expect(mock.inserts.some(w => w.table === 'raw_crawl_records' && w.values.parseStatus === 'success')).toBe(true);
  });

  it('writes a rejected raw record and does not write travel_guides for a rejected result', async () => {
    const mock = createMockDb({ travelGuides: [] });
    const result = await persistIngestedGuide(mock.db, { status: 'rejected', reason: 'bad', warnings: [], audit: { jobId: 0, rawData: {}, contentHash: 'b'.repeat(64) } });

    expect(result.action).toBe('rejected');
    expect(mock.inserts.some(w => w.table === 'travel_guides')).toBe(false);
    expect(mock.inserts.some(w => w.table === 'raw_crawl_records' && w.values.parseStatus === 'rejected')).toBe(true);
  });

  it('on refresh keeps an existing count when the new count is null (D4)', async () => {
    const mock = createMockDb({ travelGuides: [{ id: 1, platform: 'mafengwo', externalId: 'mg1', title: '北京', content: 'y'.repeat(600), viewCount: 42, enrichedData: {} }] });
    await persistIngestedGuide(mock.db, accepted({ views: null, values: { title: '北京', content: 'y'.repeat(500), crawledAt: new Date(), qualityScore: 0.5 } }));

    const update = mock.updates.find(w => w.table === 'travel_guides');
    expect(update?.values).not.toHaveProperty('viewCount');
  });
});

describe('createUserGuide / updateUserGuide', () => {
  it('createUserGuide inserts and returns the new id', async () => {
    const mock = createMockDb();
    const id = await createUserGuide(mock.db, { platform: 'manual', title: '我的攻略' });
    expect(id).toBe(999);
    expect(mock.inserts[0]?.table).toBe('travel_guides');
  });

  it('updateUserGuide writes only the provided fields', async () => {
    const mock = createMockDb();
    await updateUserGuide(mock.db, 3, { title: '改名' });
    expect(mock.updates[0]).toMatchObject({ table: 'travel_guides', values: { title: '改名' } });
  });
});

describe('applyPoiCoordinateFix', () => {
  it('mutates the aiDays POI, re-derives dayItineraries, and updates travel_guides', async () => {
    const mock = createMockDb({ travelGuides: [{ id: 5, enrichedData: { aiDays: [{ day_number: 1, pois: [{ name: 'A', latitude: 0, longitude: 0 }] }] }, dayItineraries: [] }] });
    const outcome = await applyPoiCoordinateFix(mock.db, 5, { dayNumber: 1, poiIndex: 0, latitude: 39.9, longitude: 116.4 });

    expect(outcome).toBe('updated');
    const update = mock.updates.find(w => w.table === 'travel_guides');
    expect(update?.values).toHaveProperty('dayItineraries');
  });

  it('returns not-found when the day does not exist', async () => {
    const mock = createMockDb({ travelGuides: [{ id: 5, enrichedData: { aiDays: [] }, dayItineraries: [] }] });
    expect(await applyPoiCoordinateFix(mock.db, 5, { dayNumber: 9, poiIndex: 0, latitude: 1, longitude: 1 })).toBe('not-found');
  });
});
