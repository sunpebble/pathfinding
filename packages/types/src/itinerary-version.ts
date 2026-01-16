import type { ItineraryVisibility } from './itinerary';
import type { Poi } from './poi';
import type { TransportMode } from './transport';

/**
 * Snapshot of an itinerary item at a specific version
 */
export interface VersionSnapshotItem {
  poiId: string;
  orderIndex: number;
  startTime?: string;
  endTime?: string;
  transportMode: TransportMode;
  notes?: string;
  // Enriched POI data (populated when fetching)
  poi?: Pick<
    Poi,
    'id' | 'name' | 'category' | 'address' | 'latitude' | 'longitude'
  >;
}

/**
 * Snapshot of a day at a specific version
 */
export interface VersionSnapshotDay {
  dayNumber: number;
  date: string;
  items: VersionSnapshotItem[];
}

/**
 * Full snapshot of an itinerary at a specific version
 */
export interface ItinerarySnapshot {
  title: string;
  cityId: string;
  cityName?: string;
  startDate: string;
  endDate: string;
  visibility: ItineraryVisibility;
  coverImageUrl?: string;
  days: VersionSnapshotDay[];
}

/**
 * Changes count between versions
 */
export interface VersionChangesCount {
  daysAdded: number;
  daysRemoved: number;
  itemsAdded: number;
  itemsRemoved: number;
  itemsModified: number;
}

/**
 * Itinerary version entity
 */
export interface ItineraryVersion {
  id: string;
  itineraryId: string;
  userId: string;
  versionNumber: number;
  versionNote?: string;
  snapshot: ItinerarySnapshot;
  changesSummary?: string;
  changesCount?: VersionChangesCount;
  createdAt: number;
}

/**
 * Simplified version for list display
 */
export interface ItineraryVersionListItem {
  id: string;
  itineraryId: string;
  versionNumber: number;
  versionNote?: string;
  changesSummary?: string;
  changesCount?: VersionChangesCount;
  createdAt: number;
  snapshotMeta: {
    title: string;
    daysCount: number;
    itemsCount: number;
  };
}

/**
 * Day diff status in version comparison
 */
export type DayDiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

/**
 * Day diff entry for version comparison
 */
export interface DayDiff {
  dayNumber: number;
  status: DayDiffStatus;
  olderItemCount: number;
  newerItemCount: number;
}

/**
 * Version comparison result
 */
export interface VersionComparison {
  olderVersion: {
    id: string;
    versionNumber: number;
    createdAt: number;
    title: string;
  };
  newerVersion: {
    id: string;
    versionNumber: number;
    createdAt: number;
    title: string;
  };
  changes: VersionChangesCount;
  changesSummary: string;
  daysDiff: DayDiff[];
}

/**
 * Input for creating a new version
 */
export interface CreateVersionInput {
  itineraryId: string;
  versionNote?: string;
}

/**
 * Input for updating version note
 */
export interface UpdateVersionNoteInput {
  versionNote: string;
}

/**
 * Input for restoring a version
 */
export interface RestoreVersionInput {
  createBackup?: boolean;
}

/**
 * Input for cleaning up old versions
 */
export interface CleanupVersionsInput {
  keepCount?: number;
}

/**
 * Result of version cleanup
 */
export interface CleanupVersionsResult {
  deleted: number;
  remaining: number;
}

/**
 * Version count info
 */
export interface VersionCountInfo {
  count: number;
  latestVersion: number;
}

/**
 * Result of version restore
 */
export interface RestoreVersionResult {
  success: boolean;
  restoredToVersion: number;
}
