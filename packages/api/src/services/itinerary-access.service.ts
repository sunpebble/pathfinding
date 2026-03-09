/**
 * Itinerary access-control service — deep module for permission checks.
 *
 * Consolidates ownership/collaborator lookups that were previously duplicated
 * across `itineraries.ts` and `itinerary-collaborators.ts`.
 *
 * Interface:
 *   findOwned(itineraryId, userId)  → row | null
 *   findAccessible(itineraryId, userId) → { itinerary, access } | null
 *   findEditable(itineraryId, userId)   → { itinerary, access } | null
 *   findScopedDay(itineraryId, dayId)   → row | null
 *   findScopedItem(dayId, itemId)       → row | null
 *   findScopedItems(dayId, itemIds)     → rows
 */
import {
  getDb,
  itineraries,
  itineraryCollaborators,
  itineraryDays,
  itineraryItems,
} from '@pathfinding/database';
import { and, eq, inArray } from 'drizzle-orm';

type CollaboratorRole = 'viewer' | 'editor' | 'owner';

export interface AccessResult {
  itinerary: typeof itineraries.$inferSelect | null;
  access: CollaboratorRole;
}

// ---------------------------------------------------------------------------
// Core lookups
// ---------------------------------------------------------------------------

/**
 * Find an itinerary owned by the given user. Returns `null` if no match.
 */
export async function findOwned(itineraryId: number, userId: number) {
  const db = getDb();
  const result = await db
    .select()
    .from(itineraries)
    .where(
      and(
        eq(itineraries.id, itineraryId),
        eq(itineraries.userId, userId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * Check whether `userId` has a collaborator record with one of `allowedRoles`.
 */
async function findCollaboratorRole(
  itineraryId: number,
  userId: number,
  allowedRoles: CollaboratorRole[],
) {
  const db = getDb();
  const result = await db
    .select()
    .from(itineraryCollaborators)
    .where(
      and(
        eq(itineraryCollaborators.itineraryId, itineraryId),
        eq(itineraryCollaborators.userId, userId),
      ),
    )
    .limit(1);

  const collaborator = result[0] ?? null;
  if (!collaborator)
    return null;

  return allowedRoles.includes(collaborator.role as CollaboratorRole)
    ? collaborator
    : null;
}

/**
 * Find an itinerary that the user can *read* (as owner or viewer/editor).
 */
export async function findAccessible(
  itineraryId: number,
  userId: number,
): Promise<AccessResult | null> {
  const owned = await findOwned(itineraryId, userId);
  if (owned) {
    return { itinerary: owned, access: 'owner' };
  }

  const collaborator = await findCollaboratorRole(
    itineraryId,
    userId,
    ['viewer', 'editor'],
  );
  if (!collaborator)
    return null;

  // Fetch the itinerary itself for callers that need it.
  const db = getDb();
  const rows = await db
    .select()
    .from(itineraries)
    .where(eq(itineraries.id, itineraryId))
    .limit(1);

  return {
    itinerary: rows[0] ?? null,
    access: collaborator.role as CollaboratorRole,
  };
}

/**
 * Find an itinerary that the user can *write* to (as owner or editor).
 */
export async function findEditable(
  itineraryId: number,
  userId: number,
): Promise<AccessResult | null> {
  const owned = await findOwned(itineraryId, userId);
  if (owned) {
    return { itinerary: owned, access: 'owner' };
  }

  const collaborator = await findCollaboratorRole(
    itineraryId,
    userId,
    ['editor'],
  );
  if (!collaborator)
    return null;

  return { itinerary: null, access: collaborator.role as CollaboratorRole };
}

// ---------------------------------------------------------------------------
// Scoped sub-resource lookups
// ---------------------------------------------------------------------------

/** Find a day that belongs to the given itinerary. */
export async function findScopedDay(itineraryId: number, dayId: number) {
  const db = getDb();
  const result = await db
    .select()
    .from(itineraryDays)
    .where(
      and(
        eq(itineraryDays.id, dayId),
        eq(itineraryDays.itineraryId, itineraryId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

/** Find an item that belongs to the given day. */
export async function findScopedItem(dayId: number, itemId: number) {
  const db = getDb();
  const result = await db
    .select()
    .from(itineraryItems)
    .where(
      and(
        eq(itineraryItems.id, itemId),
        eq(itineraryItems.dayId, dayId),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

/** Find multiple items that belong to the given day. */
export async function findScopedItems(dayId: number, itemIds: number[]) {
  const db = getDb();
  return db
    .select()
    .from(itineraryItems)
    .where(
      and(
        eq(itineraryItems.dayId, dayId),
        inArray(itineraryItems.id, itemIds),
      ),
    )
    .limit(itemIds.length);
}
