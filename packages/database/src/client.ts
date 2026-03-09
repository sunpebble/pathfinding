import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema/index.js';

// ---------------------------------------------------------------------------
// Internal singleton state — hidden from consumers.
// ---------------------------------------------------------------------------

let _pool: mysql.Pool | null = null;
let _db: Database | null = null;

function resolveConnectionString(connectionString?: string): string {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL environment variable is required. '
      + 'Example: mysql://root:@127.0.0.1:4000/pathfinding',
    );
  }
  return url;
}

// ---------------------------------------------------------------------------
// Public API — simple interface, deep implementation.
// ---------------------------------------------------------------------------

/**
 * Create a raw MySQL connection pool for TiDB.
 *
 * Prefer `getDb()` for application code; this is exposed only for advanced
 * use cases (migrations, health-checks, custom queries).
 */
export function createPool(connectionString?: string) {
  return mysql.createPool({
    uri: resolveConnectionString(connectionString),
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
}

/**
 * Create a **new** Drizzle ORM database instance.
 *
 * ⚠️  Each call allocates a new connection pool. Prefer `getDb()` instead —
 * it returns a lazily-initialised singleton that is reused across the entire
 * process lifetime.
 */
export function createDb(connectionString?: string) {
  const pool = createPool(connectionString);
  return drizzle(pool, { schema, mode: 'default' });
}

/**
 * Return a process-wide singleton Drizzle database instance.
 *
 * This is the **recommended** entry-point for all application code.
 * The underlying connection pool is created once and reused, avoiding the
 * overhead (and leak) of opening a new pool per request.
 */
export function getDb(): Database {
  if (!_db) {
    _pool = createPool();
    _db = drizzle(_pool, { schema, mode: 'default' });
  }
  return _db;
}

/**
 * Gracefully close the singleton connection pool.
 *
 * Call this during server shutdown to release all database connections.
 * After calling this, the next `getDb()` call will re-initialise a fresh pool.
 */
export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

/** Convenience type for the database instance. */
export type Database = ReturnType<typeof createDb>;
