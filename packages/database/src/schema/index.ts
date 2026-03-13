/**
 * Barrel file — re-exports every schema module.
 *
 * Import from `@pathfinding/database/schema` to access all tables,
 * or from `@pathfinding/database/schema/columns` for shared column helpers.
 */

// ── AI & agent ─────────────────────────────────────────
export * from './agent';

// ── Auth & users ───────────────────────────────────────
export * from './auth';
export * from './chat';

// ── Core travel data ───────────────────────────────────
export * from './cities';
// ── Shared column helpers ──────────────────────────────
export * from './columns';

// ── Content & discovery ────────────────────────────────
export * from './crawl';
// ── Travel utilities ───────────────────────────────────
export * from './currency';
// ── Connectivity ───────────────────────────────────────
export * from './ev-charging';
// ── Social & collaboration ─────────────────────────────
export * from './expense-splitting';

export * from './flights';
export * from './guides';
export * from './insurance';
export * from './itineraries';
export * from './local-events';
export * from './luggage';
export * from './mafengwo';

export * from './messaging';
export * from './notifications';
export * from './packing';

export * from './pois';
export * from './profiles';
export * from './relations';
export * from './safety';
export * from './search';
export * from './sharing';
export * from './sim-cards';

export * from './translations';
export * from './travel-footprints';
export * from './travel-notes';
export * from './travel-partners';
export * from './visa';
export * from './weather';
export * from './wifi';
