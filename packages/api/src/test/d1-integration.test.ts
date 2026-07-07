import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const db = env.TEST_DB;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('d1 integration', () => {
  beforeEach(async () => {
    await db.exec('DELETE FROM users;');
  });
  afterEach(async () => {
    await db.exec('DELETE FROM users;');
  });

  describe('updated_at AFTER UPDATE trigger', () => {
    it('refreshes updated_at on UPDATE (0001 migration trigger)', async () => {
      await db
        .prepare('INSERT INTO users (name, email) VALUES (?, ?)')
        .bind('alice', 'alice@example.com')
        .run();
      const before = await db
        .prepare('SELECT updated_at FROM users WHERE email = ?')
        .bind('alice@example.com')
        .first<{ updated_at: number }>();

      expect(before).not.toBeNull();
      // Wait > 1s so the second-level unixepoch() tick must differ.
      await sleep(1100);

      await db
        .prepare('UPDATE users SET name = ? WHERE email = ?')
        .bind('alice-renamed', 'alice@example.com')
        .run();

      const after = await db
        .prepare('SELECT updated_at, name FROM users WHERE email = ?')
        .bind('alice@example.com')
        .first<{ updated_at: number; name: string }>();

      expect(after).not.toBeNull();
      expect(after!.name).toBe('alice-renamed');
      expect(after!.updated_at).toBeGreaterThan(before!.updated_at);
    });

    it('preserves an explicitly-set updated_at (trigger WHERE clause)', async () => {
      await db
        .prepare('INSERT INTO users (name, email) VALUES (?, ?)')
        .bind('bob', 'bob@example.com')
        .run();

      const pinned = 1_000_000_000;
      await db
        .prepare('UPDATE users SET updated_at = ? WHERE email = ?')
        .bind(pinned, 'bob@example.com')
        .run();

      const row = await db
        .prepare('SELECT updated_at FROM users WHERE email = ?')
        .bind('bob@example.com')
        .first<{ updated_at: number }>();

      expect(row).not.toBeNull();
      expect(row!.updated_at).toBe(pinned);
    });

    it('the 0001 migration installed a trigger for users', async () => {
      const trigger = await db
        .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
        .bind('trigger', 'users_updated_at')
        .first<{ name: string }>();
      expect(trigger).not.toBeNull();
      expect(trigger!.name).toBe('users_updated_at');
    });
  });

  describe('rETURNING clause', () => {
    it('returns the auto-generated id on INSERT', async () => {
      const result = await db
        .prepare('INSERT INTO users (name, email) VALUES (?, ?) RETURNING id')
        .bind('carol', 'carol@example.com')
        .first<{ id: number }>();

      expect(result).not.toBeNull();
      expect(typeof result!.id).toBe('number');
      expect(result!.id).toBeGreaterThan(0);
    });

    it('returns multiple rows when several are inserted', async () => {
      const stmt = await db
        .prepare('INSERT INTO users (name, email) VALUES (?, ?), (?, ?) RETURNING id')
        .bind('d1', 'd1@example.com', 'd2', 'd2@example.com')
        .all<{ id: number }>();

      expect(stmt.results).toHaveLength(2);
      expect(stmt.results[0]!.id).not.toBe(stmt.results[1]!.id);
    });
  });

  describe('json column round-trip', () => {
    // The production schema stores JSON in TEXT columns (e.g. image_urls,
    // destinations). Drizzle's `text({ mode: 'json' })` serializes the JS
    // object to a TEXT value on write and parses it back on read. D1 only
    // sees TEXT; we verify the round-trip behaves as the app expects.
    beforeEach(async () => {
      await db.exec(
        'CREATE TABLE IF NOT EXISTS test_json (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL);',
      );
    });
    afterEach(async () => {
      await db.exec('DROP TABLE IF EXISTS test_json;');
    });

    it('round-trips a JSON object stored in a TEXT column', async () => {
      const payload = { city: 'Tokyo', days: 5, stops: ['Senso-ji', 'Shibuya'] };
      await db
        .prepare('INSERT INTO test_json (payload) VALUES (?)')
        .bind(JSON.stringify(payload))
        .run();

      const row = await db
        .prepare('SELECT payload FROM test_json WHERE id = (SELECT MAX(id) FROM test_json)')
        .first<{ payload: string }>();

      expect(row).not.toBeNull();
      const parsed = JSON.parse(row!.payload);
      expect(parsed).toEqual(payload);
    });

    it('round-trips a JSON array', async () => {
      const tags = ['food', 'culture', 'hiking'];
      await db
        .prepare('INSERT INTO test_json (payload) VALUES (?)')
        .bind(JSON.stringify(tags))
        .run();

      const row = await db
        .prepare('SELECT payload FROM test_json ORDER BY id DESC LIMIT 1')
        .first<{ payload: string }>();

      expect(row).not.toBeNull();
      expect(JSON.parse(row!.payload)).toEqual(tags);
    });
  });
});
