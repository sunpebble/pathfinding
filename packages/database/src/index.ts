/**
 * @pathfinding/database — package entry point.
 *
 * Re-exports schema definitions and client utilities.
 */
export { closeDb, createDb, createPool, type Database, getDb } from './client.js';
export * from './schema/index.js';
