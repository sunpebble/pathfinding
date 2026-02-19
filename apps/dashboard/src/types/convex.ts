import type { Id, TableNames } from "@pathfinding/convex-client";

/**
 * Helper to safely convert string to Convex ID
 * Use when receiving ID from route params or external sources
 */
export function toConvexId<T extends TableNames>(id: string): Id<T> {
  return id as Id<T>;
}

/**
 * Type guard to check if value is a valid ID format
 */
export function isValidConvexId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
