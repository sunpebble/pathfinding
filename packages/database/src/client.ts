/**
 * @module client
 *
 * Database client for the Pathfinding monorepo.
 *
 * Provides a connection-pool backed Drizzle ORM instance targeting
 * MySQL / TiDB. Three levels of access are available:
 *
 * | Function       | Use case                                    |
 * | -------------- | ------------------------------------------- |
 * | `getDb()`      | Application code (singleton, recommended)   |
 * | `createDb()`   | Tests / scripts needing an isolated instance |
 * | `createPool()` | Migrations, health-checks, raw SQL          |
 */
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Drizzle ORM database instance type with full schema inference. */
export type Database = ReturnType<typeof createDb>;

// ---------------------------------------------------------------------------
// Internal singleton state — hidden from consumers.
// ---------------------------------------------------------------------------

let _pool: mysql.Pool | null = null;
let _db: Database | null = null;

/**
 * Resolve the MySQL connection string from an explicit parameter or
 * the `DATABASE_URL` environment variable.
 *
 * @param connectionString - Optional override; falls back to `process.env.DATABASE_URL`.
 * @returns A valid MySQL connection URI.
 * @throws {Error} If neither the parameter nor the env var is set.
 */
function resolveConnectionString(connectionString?: string): string {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '[pathfinding/database] DATABASE_URL is not set. '
      + 'Provide it as an environment variable or pass a connection string explicitly.\n'
      + 'Example: mysql://root:@127.0.0.1:4000/pathfinding',
    );
  }
  return url;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a raw MySQL connection pool.
 *
 * Prefer {@link getDb} for application code; this is exposed only for
 * advanced use cases (migrations, health-checks, custom queries).
 *
 * @param connectionString - Optional MySQL URI override.
 * @returns A `mysql2/promise` connection pool.
 */
export function createPool(connectionString?: string): mysql.Pool {
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
 * Create a **new** Drizzle ORM database instance backed by a fresh pool.
 *
 * ⚠️  Each call allocates a new connection pool. Prefer {@link getDb}
 * instead — it returns a lazily-initialised singleton that is reused across
 * the entire process lifetime.
 *
 * @param connectionString - Optional MySQL URI override.
 * @returns A Drizzle database instance with the full schema attached.
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
 * overhead (and potential leak) of opening a new pool per request.
 *
 * @returns The singleton {@link Database} instance.
 */
export function getDb(): Database {
  if (!_db) {
    _pool = createPool();
    _db = drizzle(_pool, { schema, mode: 'default' });
  }
  return _db;
}
