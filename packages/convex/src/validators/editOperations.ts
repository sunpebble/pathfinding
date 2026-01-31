import { v } from 'convex/values';

/**
 * Time period validator for business hours
 */
export const timePeriodValidator = v.object({
  open: v.string(),
  close: v.string(),
});

/**
 * Base changes shared across all operation types
 */
const baseChangesValidator = v.object({
  /** Optional description of the change */
  description: v.optional(v.string()),
  /** Timestamp when the change was made */
  changedAt: v.optional(v.number()),
});

/**
 * Changes for 'create' operation type
 * Contains the full object being created
 */
export const createChangesValidator = v.object({
  operationType: v.literal('create'),
  /** The data for the new entity */
  data: v.object({
    /** For day creation */
    dayNumber: v.optional(v.number()),
    date: v.optional(v.string()),
    /** For item creation */
    poiId: v.optional(v.string()),
    orderIndex: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    transportMode: v.optional(v.string()),
    notes: v.optional(v.string()),
    /** For itinerary creation */
    title: v.optional(v.string()),
    cityId: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    visibility: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
  }),
  ...baseChangesValidator.fields,
});

/**
 * Changes for 'update' operation type
 * Contains before/after values for modified fields
 */
export const updateChangesValidator = v.object({
  operationType: v.literal('update'),
  /** Fields that were modified */
  fields: v.array(
    v.object({
      fieldName: v.string(),
      oldValue: v.optional(v.any()),
      newValue: v.optional(v.any()),
    }),
  ),
  ...baseChangesValidator.fields,
});

/**
 * Changes for 'delete' operation type
 * Contains snapshot of deleted entity
 */
export const deleteChangesValidator = v.object({
  operationType: v.literal('delete'),
  /** Snapshot of the deleted entity for potential undo */
  deletedData: v.optional(
    v.object({
      dayNumber: v.optional(v.number()),
      date: v.optional(v.string()),
      poiId: v.optional(v.string()),
      orderIndex: v.optional(v.number()),
      startTime: v.optional(v.string()),
      endTime: v.optional(v.string()),
      transportMode: v.optional(v.string()),
      notes: v.optional(v.string()),
      title: v.optional(v.string()),
      cityId: v.optional(v.string()),
      startDate: v.optional(v.string()),
      endDate: v.optional(v.string()),
      visibility: v.optional(v.string()),
      coverImageUrl: v.optional(v.string()),
    }),
  ),
  ...baseChangesValidator.fields,
});

/**
 * Changes for 'reorder' operation type
 * Contains old and new positions/indices
 */
export const reorderChangesValidator = v.object({
  operationType: v.literal('reorder'),
  /** Old index/position */
  fromIndex: v.number(),
  /** New index/position */
  toIndex: v.number(),
  /** For cross-day moves */
  fromDayId: v.optional(v.string()),
  toDayId: v.optional(v.string()),
  /** Affected item IDs in new order */
  newOrder: v.optional(v.array(v.string())),
  ...baseChangesValidator.fields,
});

/**
 * Discriminated union for editOperations.changes field
 * Uses operationType as discriminator for type-safe access
 *
 * @example
 * // In schema.ts:
 * changes: editOperationChangesValidator
 *
 * // In code:
 * if (change.operationType === 'create') {
 *   // TypeScript knows change.data exists
 * }
 */
export const editOperationChangesValidator = v.union(
  createChangesValidator,
  updateChangesValidator,
  deleteChangesValidator,
  reorderChangesValidator,
  // Legacy support: accept any object for backwards compatibility
  v.any(),
);

/**
 * Strict version without legacy fallback - use for new data only
 */
export const editOperationChangesStrictValidator = v.union(
  createChangesValidator,
  updateChangesValidator,
  deleteChangesValidator,
  reorderChangesValidator,
);
