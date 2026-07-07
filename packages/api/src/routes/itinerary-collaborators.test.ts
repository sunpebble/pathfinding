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
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ limit, orderBy });
  const from = vi.fn().mockReturnValue({ where, limit, orderBy });

  return { from, where, orderBy, limit };
}

function createInsertChain(result: unknown) {
  const returning = vi.fn().mockResolvedValue(result);
  const values = vi.fn().mockReturnValue({ returning });

  return { values, returning };
}

function createRejectedInsertChain(error: Error) {
  const returning = vi.fn().mockRejectedValue(error);
  const values = vi.fn().mockReturnValue({ returning });

  return { values, returning };
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

describe('itinerary collaborator routes', () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
    mockDb.transaction.mockReset();
  });

  it('invites a collaborator by email or user id', async () => {
    const ownerChain = createSelectChain([{ id: 7, userId: 1, title: 'Kyoto' }]);
    const emailUserChain = createSelectChain([{ id: 2, email: 'guest@example.com', name: 'Guest' }]);
    const duplicateCheckChain = createSelectChain([]);
    const userIdChain = createSelectChain([{ id: 3, email: 'member@example.com', name: 'Member' }]);
    const duplicateCheckByIdChain = createSelectChain([]);
    const emailInsertChain = createInsertChain([{ id: 41 }]);
    const idInsertChain = createInsertChain([{ id: 42 }]);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(emailUserChain)
      .mockReturnValueOnce(duplicateCheckChain)
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(userIdChain)
      .mockReturnValueOnce(duplicateCheckByIdChain);
    mockDb.insert
      .mockReturnValueOnce(emailInsertChain)
      .mockReturnValueOnce(idInsertChain);

    const emailResponse = await requestWithAuth(createApp(), '/api/itinerary-collaborators/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itineraryId: 7, email: 'guest@example.com', role: 'editor' }),
    });

    const userIdResponse = await requestWithAuth(createApp(), '/api/itinerary-collaborators/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itineraryId: 7, userId: 3, role: 'viewer' }),
    });

    expect(emailResponse.status).toBe(201);
    await expect(emailResponse.json()).resolves.toEqual({
      data: {
        id: 41,
        itinerary_id: 7,
        user_id: 2,
        role: 'editor',
      },
    });

    expect(userIdResponse.status).toBe(201);
    await expect(userIdResponse.json()).resolves.toEqual({
      data: {
        id: 42,
        itinerary_id: 7,
        user_id: 3,
        role: 'viewer',
      },
    });
  });

  it('maps duplicate collaborator insert conflicts to 409', async () => {
    const ownerChain = createSelectChain([{ id: 7, userId: 1, title: 'Kyoto' }]);
    const emailUserChain = createSelectChain([{ id: 2, email: 'guest@example.com', name: 'Guest' }]);
    const duplicateCheckChain = createSelectChain([]);
    const duplicateError = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
    const insertChain = createRejectedInsertChain(duplicateError);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(emailUserChain)
      .mockReturnValueOnce(duplicateCheckChain);
    mockDb.insert.mockReturnValueOnce(insertChain);

    const response = await requestWithAuth(createApp(), '/api/itinerary-collaborators/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itineraryId: 7, email: 'guest@example.com', role: 'editor' }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: '协作者已存在' });
  });

  it('lists collaborators with the owner role included', async () => {
    const ownerChain = createSelectChain([{ id: 7, userId: 1, title: 'Kyoto' }]);
    const ownerUserChain = createSelectChain([
      { id: 1, email: 'owner@example.com', name: 'Owner', image: null },
    ]);
    const collaboratorsChain = createSelectChain([
      { id: 10, itineraryId: 7, userId: 2, role: 'editor' },
      { id: 11, itineraryId: 7, userId: 3, role: 'viewer' },
    ]);
    const usersChain = createSelectChain([
      { id: 2, email: 'editor@example.com', name: 'Editor', image: 'editor.png' },
      { id: 3, email: 'viewer@example.com', name: 'Viewer', image: null },
    ]);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(ownerUserChain)
      .mockReturnValueOnce(collaboratorsChain)
      .mockReturnValueOnce(usersChain);

    const response = await requestWithAuth(
      createApp(),
      '/api/itinerary-collaborators?itineraryId=7',
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: 'owner-7',
          itinerary_id: 7,
          user_id: 1,
          role: 'owner',
          user: {
            id: 1,
            email: 'owner@example.com',
            name: 'Owner',
            image: null,
          },
        },
        {
          id: 10,
          itinerary_id: 7,
          user_id: 2,
          role: 'editor',
          user: {
            id: 2,
            email: 'editor@example.com',
            name: 'Editor',
            image: 'editor.png',
          },
        },
        {
          id: 11,
          itinerary_id: 7,
          user_id: 3,
          role: 'viewer',
          user: {
            id: 3,
            email: 'viewer@example.com',
            name: 'Viewer',
            image: null,
          },
        },
      ],
    });
  });

  it('allows an accepted collaborator to fetch collaborator data', async () => {
    const ownerChain = createSelectChain([]);
    const accessChain = createSelectChain([{ id: 10, itineraryId: 7, userId: 2, role: 'viewer' }]);
    const itineraryChain = createSelectChain([{ id: 7, userId: 1, title: 'Kyoto' }]);
    const ownerUserChain = createSelectChain([
      { id: 1, email: 'owner@example.com', name: 'Owner', image: null },
    ]);
    const collaboratorsChain = createSelectChain([
      { id: 10, itineraryId: 7, userId: 2, role: 'viewer' },
    ]);
    const usersChain = createSelectChain([
      { id: 2, email: 'viewer@example.com', name: 'Viewer', image: null },
    ]);

    mockDb.select
      .mockReturnValueOnce(ownerChain)
      .mockReturnValueOnce(accessChain)
      .mockReturnValueOnce(itineraryChain)
      .mockReturnValueOnce(ownerUserChain)
      .mockReturnValueOnce(collaboratorsChain)
      .mockReturnValueOnce(usersChain);

    const response = await requestWithAuth(
      createApp(),
      '/api/itinerary-collaborators?itineraryId=7',
      {},
      { userId: '2' },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: 'owner-7',
          itinerary_id: 7,
          user_id: 1,
          role: 'owner',
          user: {
            id: 1,
            email: 'owner@example.com',
            name: 'Owner',
            image: null,
          },
        },
        {
          id: 10,
          itinerary_id: 7,
          user_id: 2,
          role: 'viewer',
          user: {
            id: 2,
            email: 'viewer@example.com',
            name: 'Viewer',
            image: null,
          },
        },
      ],
    });
  });

  it('updates a collaborator role', async () => {
    const collaboratorChain = createSelectChain([{ id: 10, itineraryId: 7, userId: 2, role: 'viewer' }]);
    const ownerChain = createSelectChain([{ id: 7, userId: 1, title: 'Kyoto' }]);
    const updateChain = createUpdateChain([{ id: 10, itineraryId: 7, userId: 2, role: 'editor' }]);

    mockDb.select
      .mockReturnValueOnce(collaboratorChain)
      .mockReturnValueOnce(ownerChain);
    mockDb.update.mockReturnValueOnce(updateChain);

    const response = await requestWithAuth(createApp(), '/api/itinerary-collaborators/10', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'editor' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 10,
        itinerary_id: 7,
        user_id: 2,
        role: 'editor',
      },
    });
  });

  it('removes a collaborator', async () => {
    const collaboratorChain = createSelectChain([{ id: 10, itineraryId: 7, userId: 2, role: 'viewer' }]);
    const ownerChain = createSelectChain([{ id: 7, userId: 1, title: 'Kyoto' }]);
    const deleteChain = createDeleteChain([{ id: 10, itineraryId: 7, userId: 2, role: 'viewer' }]);

    mockDb.select
      .mockReturnValueOnce(collaboratorChain)
      .mockReturnValueOnce(ownerChain);
    mockDb.delete.mockReturnValueOnce(deleteChain);

    const response = await requestWithAuth(createApp(), '/api/itinerary-collaborators/10', {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: 10,
        itinerary_id: 7,
        user_id: 2,
        role: 'viewer',
      },
      success: true,
    });
  });
});
