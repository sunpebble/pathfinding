import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithAuth } from '../test/helpers.js';

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
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
  const orderBy = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit, orderBy });
  const from = vi.fn().mockReturnValue({ where, limit, orderBy });

  return { from, where, limit, orderBy };
}

function createListSelectChain(result: unknown) {
  const offset = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ offset });
  const orderBy = vi.fn().mockReturnValue({ limit, offset });
  const where = vi.fn().mockReturnValue({ orderBy, limit, offset });
  const from = vi.fn().mockReturnValue({ where, orderBy, limit, offset });

  return { from, where, orderBy, limit, offset };
}

function createUpdateChain(result: unknown) {
  const where = vi.fn().mockResolvedValue(result);
  const set = vi.fn().mockReturnValue({ where });

  return { set, where };
}

function createDeleteChain(result: unknown) {
  const where = vi.fn().mockResolvedValue(result);

  return { where };
}

describe('itinerary mutation routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
    mockDb.transaction.mockReset();
  });

  it('updates an itinerary item', async () => {
    const ownerChain = createSelectChain([{ id: 9, userId: 1 }]);
    const scopedDayChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const scopedItemChain = createSelectChain([{ id: 301, dayId: 201, poiId: 401, orderIndex: 0 }]);
    const itemUpdateChain = createUpdateChain([{ id: 301, dayId: 201 }]);
    const itineraryChain = createSelectChain([{ id: 9, userId: 1, title: 'Kyoto', cityId: 88 }]);
    const daysChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const itemsChain = createSelectChain([
      {
        id: 301,
        dayId: 201,
        poiId: 401,
        orderIndex: 0,
        startTime: '10:00',
        endTime: '11:00',
        transportMode: 'walking',
        notes: 'Updated stop',
      },
    ]);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(scopedDayChain)
      .mockReturnValueOnce(scopedItemChain)
      .mockReturnValueOnce(itineraryChain)
      .mockReturnValueOnce(daysChain)
      .mockReturnValueOnce(itemsChain);
    mockDb.update.mockReturnValueOnce(itemUpdateChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries/9/days/201/items/301', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Updated stop',
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 9,
        user_id: 1,
        title: 'Kyoto',
        city_id: 88,
        days: [
          {
            id: 201,
            itinerary_id: 9,
            day_number: 1,
            date: '2026-04-01',
            items: [
              {
                id: 301,
                day_id: 201,
                poi_id: 401,
                order_index: 0,
                start_time: '10:00',
                end_time: '11:00',
                transport_mode: 'walking',
                notes: 'Updated stop',
              },
            ],
          },
        ],
      },
    });
  });

  it('allows an editor collaborator to update an itinerary item', async () => {
    const ownerCheckChain = createSelectChain([]);
    const collaboratorAccessChain = createSelectChain([{ id: 77, itineraryId: 9, userId: 2, role: 'editor' }]);
    const scopedDayChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const scopedItemChain = createSelectChain([{ id: 301, dayId: 201, poiId: 401, orderIndex: 0 }]);
    const itemUpdateChain = createUpdateChain([{ id: 301, dayId: 201 }]);
    const itineraryChain = createSelectChain([{ id: 9, userId: 1, title: 'Kyoto', cityId: 88, visibility: 'private' }]);
    const daysChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const itemsChain = createSelectChain([
      {
        id: 301,
        dayId: 201,
        poiId: 401,
        orderIndex: 0,
        startTime: '10:00',
        endTime: '11:00',
        transportMode: 'walking',
        notes: 'Editor updated stop',
      },
    ]);

    mockDb.select
      .mockReturnValueOnce(ownerCheckChain)
      .mockReturnValueOnce(collaboratorAccessChain)
      .mockReturnValueOnce(scopedDayChain)
      .mockReturnValueOnce(scopedItemChain)
      .mockReturnValueOnce(itineraryChain)
      .mockReturnValueOnce(daysChain)
      .mockReturnValueOnce(itemsChain);
    mockDb.update.mockReturnValueOnce(itemUpdateChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries/9/days/201/items/301', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Editor updated stop' }),
    }, { userId: '2' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 9,
        user_id: 1,
        title: 'Kyoto',
        city_id: 88,
        visibility: 'private',
        days: [
          {
            id: 201,
            itinerary_id: 9,
            day_number: 1,
            date: '2026-04-01',
            items: [
              {
                id: 301,
                day_id: 201,
                poi_id: 401,
                order_index: 0,
                start_time: '10:00',
                end_time: '11:00',
                transport_mode: 'walking',
                notes: 'Editor updated stop',
              },
            ],
          },
        ],
      },
    });
  });

  it('deletes an itinerary item', async () => {
    const ownerChain = createSelectChain([{ id: 9, userId: 1 }]);
    const scopedDayChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const scopedItemChain = createSelectChain([{ id: 301, dayId: 201, poiId: 401, orderIndex: 0 }]);
    const deleteChain = createDeleteChain([{ id: 301, dayId: 201 }]);
    const itineraryChain = createSelectChain([{ id: 9, userId: 1, title: 'Kyoto', cityId: 88 }]);
    const daysChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const itemsChain = createSelectChain([]);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(scopedDayChain)
      .mockReturnValueOnce(scopedItemChain)
      .mockReturnValueOnce(itineraryChain)
      .mockReturnValueOnce(daysChain)
      .mockReturnValueOnce(itemsChain);
    mockDb.delete.mockReturnValueOnce(deleteChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries/9/days/201/items/301', {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 9,
        user_id: 1,
        title: 'Kyoto',
        city_id: 88,
        days: [
          {
            id: 201,
            itinerary_id: 9,
            day_number: 1,
            date: '2026-04-01',
            items: [],
          },
        ],
      },
      success: true,
    });
  });

  it('reorders itinerary items', async () => {
    const ownerChain = createSelectChain([{ id: 9, userId: 1 }]);
    const scopedDayChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const scopedItemsForValidationChain = createSelectChain([
      { id: 302, dayId: 201, poiId: 402, orderIndex: 0 },
      { id: 301, dayId: 201, poiId: 401, orderIndex: 1 },
    ]);
    const updateFirstChain = createUpdateChain([{ id: 301, orderIndex: 1 }]);
    const updateSecondChain = createUpdateChain([{ id: 302, orderIndex: 0 }]);
    const itineraryChain = createSelectChain([{ id: 9, userId: 1, title: 'Kyoto', cityId: 88 }]);
    const daysChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const itemsChain = createSelectChain([
      {
        id: 302,
        dayId: 201,
        poiId: 402,
        orderIndex: 0,
        startTime: null,
        endTime: null,
        transportMode: 'walking',
        notes: null,
      },
      {
        id: 301,
        dayId: 201,
        poiId: 401,
        orderIndex: 1,
        startTime: null,
        endTime: null,
        transportMode: 'walking',
        notes: null,
      },
    ]);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(scopedDayChain)
      .mockReturnValueOnce(scopedItemsForValidationChain)
      .mockReturnValueOnce(itineraryChain)
      .mockReturnValueOnce(daysChain)
      .mockReturnValueOnce(itemsChain);
    mockDb.update
      .mockReturnValueOnce(updateFirstChain)
      .mockReturnValueOnce(updateSecondChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries/9/days/201/items/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: [302, 301] }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 9,
        user_id: 1,
        title: 'Kyoto',
        city_id: 88,
        days: [
          {
            id: 201,
            itinerary_id: 9,
            day_number: 1,
            date: '2026-04-01',
            items: [
              {
                id: 302,
                day_id: 201,
                poi_id: 402,
                order_index: 0,
                start_time: null,
                end_time: null,
                transport_mode: 'walking',
                notes: null,
              },
              {
                id: 301,
                day_id: 201,
                poi_id: 401,
                order_index: 1,
                start_time: null,
                end_time: null,
                transport_mode: 'walking',
                notes: null,
              },
            ],
          },
        ],
      },
    });
  });

  it('reorders itinerary items atomically when an update fails', async () => {
    const ownerChain = createSelectChain([{ id: 9, userId: 1 }]);
    const scopedDayChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const scopedItemsForValidationChain = createSelectChain([
      { id: 302, dayId: 201, poiId: 402, orderIndex: 0 },
      { id: 301, dayId: 201, poiId: 401, orderIndex: 1 },
    ]);
    const txUpdateFirstChain = createUpdateChain([{ id: 302, orderIndex: 0 }]);
    const txUpdateWhere = vi.fn().mockRejectedValueOnce(new Error('write failed'));
    const txUpdateSecond = { set: vi.fn().mockReturnValue({ where: txUpdateWhere }) };
    const txUpdate = vi.fn()
      .mockReturnValueOnce(txUpdateFirstChain)
      .mockReturnValueOnce(txUpdateSecond);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(scopedDayChain)
      .mockReturnValueOnce(scopedItemsForValidationChain);
    mockDb.transaction.mockImplementation(async (callback: (tx: typeof mockDb) => Promise<void>) => {
      await callback({
        ...mockDb,
        update: txUpdate,
      });
    });

    const response = await requestWithAuth(createApp(), '/api/itineraries/9/days/201/items/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: [302, 301] }),
    });

    expect(response.status).toBe(500);
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('deletes an itinerary day', async () => {
    const ownerChain = createSelectChain([{ id: 9, userId: 1 }]);
    const scopedDayChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const txDeleteItemsChain = createDeleteChain([{ id: 301 }]);
    const txDeleteDayChain = createDeleteChain([{ id: 201 }]);
    mockDb.transaction.mockImplementation(async (callback: (tx: typeof mockDb) => Promise<void>) => {
      await callback({
        ...mockDb,
        delete: vi.fn()
          .mockReturnValueOnce(txDeleteItemsChain)
          .mockReturnValueOnce(txDeleteDayChain),
      });
    });

    const itineraryChain = createSelectChain([{ id: 9, userId: 1, title: 'Kyoto', cityId: 88 }]);
    const daysChain = createSelectChain([]);
    const itemsChain = createSelectChain([]);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(scopedDayChain)
      .mockReturnValueOnce(itineraryChain)
      .mockReturnValueOnce(daysChain)
      .mockReturnValueOnce(itemsChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries/9/days/201', {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 9,
        user_id: 1,
        title: 'Kyoto',
        city_id: 88,
        days: [],
      },
      success: true,
    });
  });

  it('rejects updating an item outside the scoped day', async () => {
    const ownerChain = createSelectChain([{ id: 9, userId: 1 }]);
    const dayChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const missingItemChain = createSelectChain([]);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(dayChain)
      .mockReturnValueOnce(missingItemChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries/9/days/201/items/301', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Should not update' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Itinerary item not found' });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('rejects updating an item when itinerary ownership check fails without mutating', async () => {
    const notOwnedChain = createSelectChain([]);
    const noCollaboratorAccessChain = createSelectChain([]);

    mockDb.select
      .mockReturnValueOnce(notOwnedChain)
      .mockReturnValueOnce(noCollaboratorAccessChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries/9/days/201/items/301', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Should not update' }),
    }, { userId: '2' });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Itinerary not found or access denied' });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('rejects deleting an item outside the scoped day', async () => {
    const ownerChain = createSelectChain([{ id: 9, userId: 1 }]);
    const dayChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const missingItemChain = createSelectChain([]);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(dayChain)
      .mockReturnValueOnce(missingItemChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries/9/days/201/items/301', {
      method: 'DELETE',
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Itinerary item not found' });
    expect(mockDb.delete).not.toHaveBeenCalled();
  });

  it('rejects reordering items outside the scoped day', async () => {
    const ownerChain = createSelectChain([{ id: 9, userId: 1 }]);
    const dayChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const scopedItemsChain = createSelectChain([
      {
        id: 302,
        dayId: 201,
        poiId: 402,
        orderIndex: 0,
        startTime: null,
        endTime: null,
        transportMode: 'walking',
        notes: null,
      },
    ]);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(dayChain)
      .mockReturnValueOnce(scopedItemsChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries/9/days/201/items/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: [302, 301] }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'One or more itinerary items were not found' });
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('rejects deleting a day outside the scoped itinerary', async () => {
    const ownerChain = createSelectChain([{ id: 9, userId: 1 }]);
    const missingDayChain = createSelectChain([]);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(missingDayChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries/9/days/201', {
      method: 'DELETE',
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Itinerary day not found' });
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('rejects reordering items when itinerary ownership check fails without mutating', async () => {
    const notOwnedChain = createSelectChain([]);
    const noCollaboratorAccessChain = createSelectChain([]);

    mockDb.select
      .mockReturnValueOnce(notOwnedChain)
      .mockReturnValueOnce(noCollaboratorAccessChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries/9/days/201/items/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds: [302, 301] }),
    }, { userId: '2' });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Itinerary not found or access denied' });
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });
});

describe('itinerary read permissions', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
    mockDb.transaction.mockReset();
  });

  it('allows a viewer collaborator to read a private itinerary', async () => {
    const itineraryChain = createSelectChain([{ id: 9, userId: 1, title: 'Kyoto', cityId: 88, visibility: 'private' }]);
    const collaboratorAccessChain = createSelectChain([{ id: 55, itineraryId: 9, userId: 2, role: 'viewer' }]);
    const daysChain = createSelectChain([{ id: 201, itineraryId: 9, dayNumber: 1, date: '2026-04-01' }]);
    const itemsChain = createSelectChain([{ id: 301, dayId: 201, poiId: 401, orderIndex: 0 }]);

    mockDb.select
      .mockReturnValueOnce(itineraryChain)
      .mockReturnValueOnce(collaboratorAccessChain)
      .mockReturnValueOnce(daysChain)
      .mockReturnValueOnce(itemsChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries/9', {}, { userId: '2' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 9,
        user_id: 1,
        title: 'Kyoto',
        city_id: 88,
        visibility: 'private',
        days: [
          {
            id: 201,
            itinerary_id: 9,
            day_number: 1,
            date: '2026-04-01',
            items: [
              {
                id: 301,
                day_id: 201,
                poi_id: 401,
                order_index: 0,
              },
            ],
          },
        ],
      },
    });
  });
});

describe('itinerary read routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
    mockDb.transaction.mockReset();
  });

  it('rejects unauthenticated access to a private itinerary detail', async () => {
    const itineraryChain = createSelectChain([
      { id: 9, userId: 1, title: 'Private Kyoto', visibility: 'private' },
    ]);

    mockDb.select.mockReturnValueOnce(itineraryChain);

    const response = await createApp().request('/api/itineraries/9');

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Authorization token is required' });
  });

  it('returns all visibilities for the authenticated owner itinerary list', async () => {
    const listChain = createListSelectChain([
      { id: 9, userId: 1, title: 'Private Kyoto', visibility: 'private' },
      { id: 10, userId: 1, title: 'Public Osaka', visibility: 'public' },
    ]);

    mockDb.select.mockReturnValueOnce(listChain);

    const response = await requestWithAuth(createApp(), '/api/itineraries?userId=1');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        { id: 9, user_id: 1, title: 'Private Kyoto', visibility: 'private' },
        { id: 10, user_id: 1, title: 'Public Osaka', visibility: 'public' },
      ],
      pagination: { total: 2, limit: 20, offset: 0 },
    });
  });

  it('rejects reading another user\'s itinerary list by userId', async () => {
    const response = await requestWithAuth(createApp(), '/api/itineraries?userId=2');

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Itinerary access denied' });
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it('ignores non-public visibility filters for unauthenticated collection reads', async () => {
    const listChain = createListSelectChain([
      { id: 10, userId: 1, title: 'Public Osaka', visibility: 'public' },
    ]);

    mockDb.select.mockReturnValueOnce(listChain);

    const response = await createApp().request('/api/itineraries?visibility=private');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        { id: 10, user_id: 1, title: 'Public Osaka', visibility: 'public' },
      ],
      pagination: { total: 1, limit: 20, offset: 0 },
    });

    const whereArg = listChain.where.mock.calls[0]?.[0];
    const chunkValues = whereArg?.queryChunks
      ?.map((chunk: { value?: unknown }) => chunk?.value)
      .flat();
    expect(chunkValues).toContain('public');
    expect(chunkValues).not.toContain('private');
  });
});
