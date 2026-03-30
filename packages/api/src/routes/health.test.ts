import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';

const mockExecute = vi.fn();
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
  execute: mockExecute,
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');

  return {
    ...actual,
    createDb: vi.fn(() => mockDb),
    getDb: vi.fn(() => mockDb),
  };
});

describe('health routes', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it('gET /health returns ok status', async () => {
    const response = await createApp().request('/health');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('gET /health/ready returns ready when DB is available', async () => {
    mockExecute.mockResolvedValueOnce([{ 1: 1 }]);

    const response = await createApp().request('/health/ready');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ready');
    expect(body.version).toBeDefined();
  });

  it('gET /health/ready returns 503 when DB is unavailable', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Connection refused'));

    const response = await createApp().request('/health/ready');

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe('not_ready');
    expect(body.reason).toBe('database_unavailable');
  });
});
