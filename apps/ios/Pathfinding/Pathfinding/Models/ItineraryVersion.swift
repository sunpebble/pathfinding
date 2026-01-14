import Foundation

/// Transport mode for version snapshot items
enum VersionTransportMode: String, Codable, CaseIterable {
  case walking
  case driving
  case transit
  case cycling
  case taxi
  case other
}

/// Snapshot of an itinerary item at a specific version
struct VersionSnapshotItem: Codable, Identifiable {
  var id: String { poiId }
  let poiId: String
  let orderIndex: Int
  let startTime: String?
  let endTime: String?
  let transportMode: VersionTransportMode
  let notes: String?
  let poi: VersionSnapshotPoi?

  enum CodingKeys: String, CodingKey {
    case poiId = "poi_id"
    case orderIndex = "order_index"
    case startTime = "start_time"
    case endTime = "end_time"
    case transportMode = "transport_mode"
    case notes
    case poi
  }
}

/// POI info in version snapshot
struct VersionSnapshotPoi: Codable {
  let id: String
  let name: String
  let category: String?
  let address: String?
  let latitude: Double?
  let longitude: Double?
}

/// Snapshot of a day at a specific version
struct VersionSnapshotDay: Codable, Identifiable {
  var id: Int { dayNumber }
  let dayNumber: Int
  let date: String
  let items: [VersionSnapshotItem]

  enum CodingKeys: String, CodingKey {
    case dayNumber = "day_number"
    case date
    case items
  }
}

/// Visibility setting for itinerary
enum ItineraryVisibility: String, Codable {
  case `private`
  case `public`
  case friends
}

/// Full snapshot of an itinerary at a specific version
struct ItinerarySnapshot: Codable {
  let title: String
  let cityId: String
  let cityName: String?
  let startDate: String
  let endDate: String
  let visibility: ItineraryVisibility
  let coverImageUrl: String?
  let days: [VersionSnapshotDay]

  enum CodingKeys: String, CodingKey {
    case title
    case cityId = "city_id"
    case cityName = "city_name"
    case startDate = "start_date"
    case endDate = "end_date"
    case visibility
    case coverImageUrl = "cover_image_url"
    case days
  }
}

/// Changes count between versions
struct VersionChangesCount: Codable {
  let daysAdded: Int
  let daysRemoved: Int
  let itemsAdded: Int
  let itemsRemoved: Int
  let itemsModified: Int

  enum CodingKeys: String, CodingKey {
    case daysAdded = "days_added"
    case daysRemoved = "days_removed"
    case itemsAdded = "items_added"
    case itemsRemoved = "items_removed"
    case itemsModified = "items_modified"
  }

  /// Total number of changes
  var totalChanges: Int {
    daysAdded + daysRemoved + itemsAdded + itemsRemoved + itemsModified
  }
}

/// Itinerary version entity
struct ItineraryVersion: Codable, Identifiable {
  let id: String
  let itineraryId: String
  let userId: String
  let versionNumber: Int
  let versionNote: String?
  let snapshot: ItinerarySnapshot
  let changesSummary: String?
  let changesCount: VersionChangesCount?
  let createdAt: Int

  enum CodingKeys: String, CodingKey {
    case id
    case itineraryId = "itinerary_id"
    case userId = "user_id"
    case versionNumber = "version_number"
    case versionNote = "version_note"
    case snapshot
    case changesSummary = "changes_summary"
    case changesCount = "changes_count"
    case createdAt = "created_at"
  }

  /// Formatted creation date
  var formattedCreatedAt: String {
    let date = Date(timeIntervalSince1970: TimeInterval(createdAt) / 1000)
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd HH:mm"
    return formatter.string(from: date)
  }

  /// Relative time description
  var relativeTime: String {
    let date = Date(timeIntervalSince1970: TimeInterval(createdAt) / 1000)
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .short
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.localizedString(for: date, relativeTo: Date())
  }
}

/// Simplified version for list display
struct ItineraryVersionListItem: Codable, Identifiable {
  let id: String
  let itineraryId: String
  let versionNumber: Int
  let versionNote: String?
  let changesSummary: String?
  let changesCount: VersionChangesCount?
  let createdAt: Int
  let snapshotMeta: VersionSnapshotMeta

  enum CodingKeys: String, CodingKey {
    case id
    case itineraryId = "itinerary_id"
    case versionNumber = "version_number"
    case versionNote = "version_note"
    case changesSummary = "changes_summary"
    case changesCount = "changes_count"
    case createdAt = "created_at"
    case snapshotMeta = "snapshot_meta"
  }

  /// Formatted creation date
  var formattedCreatedAt: String {
    let date = Date(timeIntervalSince1970: TimeInterval(createdAt) / 1000)
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd HH:mm"
    return formatter.string(from: date)
  }

  /// Relative time description
  var relativeTime: String {
    let date = Date(timeIntervalSince1970: TimeInterval(createdAt) / 1000)
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .short
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.localizedString(for: date, relativeTo: Date())
  }
}

/// Snapshot metadata for list view
struct VersionSnapshotMeta: Codable {
  let title: String
  let daysCount: Int
  let itemsCount: Int

  enum CodingKeys: String, CodingKey {
    case title
    case daysCount = "days_count"
    case itemsCount = "items_count"
  }
}

/// Day diff status in version comparison
enum DayDiffStatus: String, Codable {
  case added
  case removed
  case modified
  case unchanged
}

/// Day diff entry for version comparison
struct DayDiff: Codable, Identifiable {
  var id: Int { dayNumber }
  let dayNumber: Int
  let status: DayDiffStatus
  let olderItemCount: Int
  let newerItemCount: Int

  enum CodingKeys: String, CodingKey {
    case dayNumber = "day_number"
    case status
    case olderItemCount = "older_item_count"
    case newerItemCount = "newer_item_count"
  }
}

/// Version comparison result
struct VersionComparison: Codable {
  let olderVersion: VersionComparisonInfo
  let newerVersion: VersionComparisonInfo
  let changes: VersionChangesCount
  let changesSummary: String
  let daysDiff: [DayDiff]

  enum CodingKeys: String, CodingKey {
    case olderVersion = "older_version"
    case newerVersion = "newer_version"
    case changes
    case changesSummary = "changes_summary"
    case daysDiff = "days_diff"
  }
}

/// Version info in comparison
struct VersionComparisonInfo: Codable {
  let id: String
  let versionNumber: Int
  let createdAt: Int
  let title: String

  enum CodingKeys: String, CodingKey {
    case id
    case versionNumber = "version_number"
    case createdAt = "created_at"
    case title
  }
}

/// Result of version cleanup
struct CleanupVersionsResult: Codable {
  let deleted: Int
  let remaining: Int
}

/// Version count info
struct VersionCountInfo: Codable {
  let count: Int
  let latestVersion: Int

  enum CodingKeys: String, CodingKey {
    case count
    case latestVersion = "latest_version"
  }
}

/// Result of version restore
struct RestoreVersionResult: Codable {
  let success: Bool
  let restoredToVersion: Int

  enum CodingKeys: String, CodingKey {
    case success
    case restoredToVersion = "restored_to_version"
  }
}

// MARK: - API Response Types

struct VersionListResponse: Codable {
  let success: Bool
  let data: [ItineraryVersionListItem]
  let meta: VersionListMeta
}

struct VersionListMeta: Codable {
  let page: Int
  let pageSize: Int
  let totalCount: Int
  let totalPages: Int

  enum CodingKeys: String, CodingKey {
    case page
    case pageSize = "page_size"
    case totalCount = "total_count"
    case totalPages = "total_pages"
  }
}

struct VersionDetailResponse: Codable {
  let success: Bool
  let data: ItineraryVersion
}

struct VersionCountResponse: Codable {
  let success: Bool
  let data: VersionCountInfo
}

struct VersionComparisonResponse: Codable {
  let success: Bool
  let data: VersionComparison
}

struct CreateVersionResponse: Codable {
  let success: Bool
  let data: ItineraryVersionListItem
}

struct UpdateVersionNoteResponse: Codable {
  let success: Bool
  let data: ItineraryVersionListItem
}

struct RestoreVersionResponse: Codable {
  let success: Bool
  let data: RestoreVersionResult
}

struct CleanupVersionsResponse: Codable {
  let success: Bool
  let data: CleanupVersionsResult
}

// MARK: - Request Types

struct CreateVersionRequest: Encodable {
  let versionNote: String?

  enum CodingKeys: String, CodingKey {
    case versionNote = "version_note"
  }
}

struct UpdateVersionNoteRequest: Encodable {
  let versionNote: String

  enum CodingKeys: String, CodingKey {
    case versionNote = "version_note"
  }
}

struct RestoreVersionRequest: Encodable {
  let createBackup: Bool

  enum CodingKeys: String, CodingKey {
    case createBackup = "create_backup"
  }
}

struct CleanupVersionsRequest: Encodable {
  let keepCount: Int

  enum CodingKeys: String, CodingKey {
    case keepCount = "keep_count"
  }
}
