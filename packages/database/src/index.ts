/**
 * @pathfinding/database — package entry point.
 *
 * Re-exports client utilities and all schema definitions.
 *
 * @example
 * ```ts
 * import { getDb, users, pois } from '@pathfinding/database';
 *
 * const db = getDb();
 * const allUsers = await db.select().from(users);
 * ```
 */
export { closeDb, createDb, createPool, type Database, getDb } from './client.js';
export * from './schema/index.js';
