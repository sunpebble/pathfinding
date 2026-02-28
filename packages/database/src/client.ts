import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema/index.js';

/**
 * Create a database connection pool for TiDB (MySQL-compatible).
 *
 * TiDB connection string format:
 *   mysql://user:password@host:4000/database?ssl=...
 *
 * Default TiDB port is 4000 (not 3306).
 */
export function createPool(connectionString?: string) {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL environment variable is required. '
      + 'Example: mysql://root:@127.0.0.1:4000/pathfinding',
    );
  }

  return mysql.createPool({
    uri: url,
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
 * Create a Drizzle ORM database instance connected to TiDB.
 */
export function createDb(connectionString?: string) {
  const pool = createPool(connectionString);
  return drizzle(pool, { schema, mode: 'default' });
}

/** Convenience type for the database instance. */
export type Database = ReturnType<typeof createDb>;
