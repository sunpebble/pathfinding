import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { requestWithEnv } from '../test/helpers.js';

const mockRun = vi.fn();
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
  run: mockRun,
};

vi.mock('@pathfinding/database', async () => {
  const actual = await vi.importActual<typeof import('@pathfinding/database')>('@pathfinding/database');

  return {
    ...actual,
    createDb: vi.fn(() => mockDb),
  };
});

describe('health routes', () => {
  beforeEach(() => {
    mockRun.mockReset();
  });

  it('gET /health returns ok status', async () => {
    const response = await requestWithEnv(createApp(), '/health');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });

  it('gET /health/ready returns ready when DB is available', async () => {
    mockRun.mockResolvedValueOnce([{ 1: 1 }]);

    const response = await requestWithEnv(createApp(), '/health/ready');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ready');
    expect(body.version).toBeDefined();
  });

  it('gET /health/ready returns 503 when DB is unavailable', async () => {
    mockRun.mockRejectedValueOnce(new Error('Connection refused'));

    const response = await requestWithEnv(createApp(), '/health/ready');

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe('not_ready');
    expect(body.reason).toBe('database_unavailable');
  });
});
