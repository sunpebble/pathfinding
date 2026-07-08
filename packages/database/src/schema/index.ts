/**
 * Barrel file — re-exports every schema module.
 *
 * Import from `@pathfinding/database/schema` to access all tables,
 * or from `@pathfinding/database/schema/columns` for shared column helpers.
 */

// ── AI agent ───────────────────────────────────────────
export * from './ai-plans';

// ── Auth & users ───────────────────────────────────────
export * from './auth';
export * from './chat';

// ── Core travel data ───────────────────────────────────
export * from './cities';
// ── Shared column helpers ──────────────────────────────
export * from './columns';

// ── Travel utilities ───────────────────────────────────
export * from './currency';
// ── Social & collaboration ─────────────────────────────
export * from './expense-splitting';

export * from './itineraries';

export * from './pois';
export * from './profiles';
export * from './sharing';
