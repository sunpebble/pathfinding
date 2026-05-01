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
    getDb: vi.fn(() => mockDb),
  };
});

function createSelectChain(result: unknown) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where, limit });

  return { from, where, limit };
}

function createInsertChain(insertId: number) {
  return { values: vi.fn().mockResolvedValue([{ insertId: String(insertId) }]) };
}

function createUpdateChain() {
  return { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) };
}

describe('expense-splitting routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
    mockDb.update.mockReset();
    mockDb.delete.mockReset();
    mockDb.transaction.mockReset();
  });

  describe('gET /api/expense-splitting/members', () => {
    it('returns trip members', async () => {
      const chain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 1, itineraryId: 1, name: 'Alice' },
          ]),
        }),
      };
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/expense-splitting/members?itineraryId=1');
      expect(response.status).toBe(200);
    });

    it('returns 400 when itineraryId is missing', async () => {
      const response = await requestWithAuth(createApp(), '/api/expense-splitting/members');
      expect(response.status).toBe(400);
    });
  });

  describe('pOST /api/expense-splitting/members', () => {
    it('adds a trip member', async () => {
      mockDb.insert.mockReturnValueOnce(createInsertChain(10));

      const response = await requestWithAuth(createApp(), '/api/expense-splitting/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itineraryId: 1, name: 'Bob' }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBe(10);
    });
  });

  describe('dELETE /api/expense-splitting/members/:id', () => {
    it('removes a trip member', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 1, itineraryId: 1, name: 'Alice' }]));
      mockDb.delete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue([]) });

      const response = await requestWithAuth(createApp(), '/api/expense-splitting/members/1', {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
    });

    it('returns 404 for non-existent member', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      const response = await requestWithAuth(createApp(), '/api/expense-splitting/members/999', {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('gET /api/expense-splitting/expenses', () => {
    it('returns shared expenses', async () => {
      const expensesChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 1, itineraryId: 1, paidByMemberId: 1, amount: 100 },
          ]),
        }),
      };
      const participantsChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 1, expenseId: 1, memberId: 1, shareAmount: 50 },
          ]),
        }),
      };
      mockDb.select
        .mockReturnValueOnce(expensesChain)
        .mockReturnValueOnce(participantsChain);

      const response = await requestWithAuth(createApp(), '/api/expense-splitting/expenses?itineraryId=1');
      expect(response.status).toBe(200);
    });
  });

  describe('pOST /api/expense-splitting/expenses', () => {
    it('creates a shared expense with equal split', async () => {
      mockDb.insert.mockReturnValueOnce(createInsertChain(10));
      const participantInsert = vi.fn().mockResolvedValue([{ insertId: '1' }]);
      mockDb.insert.mockReturnValue({ values: participantInsert });

      const response = await requestWithAuth(createApp(), '/api/expense-splitting/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itineraryId: 1,
          paidByMemberId: 1,
          amount: 100,
          participantMemberIds: [1, 2],
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBe(10);
    });
  });

  describe('dELETE /api/expense-splitting/expenses/:id', () => {
    it('deletes a shared expense', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 1, itineraryId: 1 }]));
      mockDb.delete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });

      const response = await requestWithAuth(createApp(), '/api/expense-splitting/expenses/1', {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
    });
  });

  describe('gET /api/expense-splitting/settlements', () => {
    it('returns settlements', async () => {
      const chain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 1, itineraryId: 1, fromMemberId: 1, toMemberId: 2, amount: 50 },
          ]),
        }),
      };
      mockDb.select.mockReturnValueOnce(chain);

      const response = await requestWithAuth(createApp(), '/api/expense-splitting/settlements?itineraryId=1');
      expect(response.status).toBe(200);
    });
  });

  describe('pOST /api/expense-splitting/settlements', () => {
    it('creates a settlement', async () => {
      mockDb.insert.mockReturnValueOnce(createInsertChain(10));

      const response = await requestWithAuth(createApp(), '/api/expense-splitting/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itineraryId: 1,
          fromMemberId: 1,
          toMemberId: 2,
          amount: 50,
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBe(10);
    });
  });

  describe('pATCH /api/expense-splitting/settlements/:id/settle', () => {
    it('marks a settlement as settled', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 1, itineraryId: 1 }]));
      mockDb.update.mockReturnValueOnce(createUpdateChain());

      const response = await requestWithAuth(createApp(), '/api/expense-splitting/settlements/1/settle', {
        method: 'PATCH',
      });

      expect(response.status).toBe(200);
    });

    it('returns 404 for non-existent settlement', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      const response = await requestWithAuth(createApp(), '/api/expense-splitting/settlements/999/settle', {
        method: 'PATCH',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('gET /api/expense-splitting/balance', () => {
    it('calculates balances', async () => {
      const membersChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 1, itineraryId: 1, name: 'Alice' },
            { id: 2, itineraryId: 1, name: 'Bob' },
          ]),
        }),
      };
      const expensesChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 1, itineraryId: 1, paidByMemberId: 1, amount: 100 },
          ]),
        }),
      };
      const participantsChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 1, expenseId: 1, memberId: 1, shareAmount: 50 },
            { id: 2, expenseId: 1, memberId: 2, shareAmount: 50 },
          ]),
        }),
      };
      const settlementsChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      };

      mockDb.select
        .mockReturnValueOnce(membersChain)
        .mockReturnValueOnce(expensesChain)
        .mockReturnValueOnce(participantsChain)
        .mockReturnValueOnce(settlementsChain);

      const response = await requestWithAuth(createApp(), '/api/expense-splitting/balance?itineraryId=1');
      expect(response.status).toBe(200);
    });
  });
});
