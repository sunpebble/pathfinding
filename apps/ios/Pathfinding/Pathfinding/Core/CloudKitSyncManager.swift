import Foundation
import CloudKit
import Observation

// MARK: - Sync Status

/// Represents the current sync status
enum SyncStatus: Equatable {
  case idle
  case syncing
  case success(Date)
  case error(String)

  var displayText: String {
    switch self {
    case .idle:
      return "icloud.sync.status.idle".localized
    case .syncing:
      return "icloud.sync.status.syncing".localized
    case .success(let date):
      return String(format: "icloud.sync.status.success".localized, date.relativeFormatted(unitsStyle: .abbreviated, localeIdentifier: nil))
    case .error(let message):
      return String(format: "icloud.sync.status.error".localized, message)
    }
  }

  var icon: String {
    switch self {
    case .idle:
      return "icloud"
    case .syncing:
      return "arrow.triangle.2.circlepath.icloud"
    case .success:
      return "checkmark.icloud"
    case .error:
      return "exclamationmark.icloud"
    }
  }

  var iconColor: String {
    switch self {
    case .idle:
      return "secondary"
    case .syncing:
      return "blue"
    case .success:
      return "green"
    case .error:
      return "red"
    }
  }
}

// MARK: - Sync Conflict

/// Represents a sync conflict between local and remote data
struct SyncConflict: Identifiable {
  let id = UUID()
  let localItinerary: SavedItinerary
  let remoteItinerary: SavedItinerary
  let localModifiedAt: Date
  let remoteModifiedAt: Date

  var conflictDescription: String {
    let formatter = DateFormatter()
    formatter.dateStyle = .short
    formatter.timeStyle = .short
    return "本地: \(formatter.string(from: localModifiedAt)) vs 云端: \(formatter.string(from: remoteModifiedAt))"
  }
}

/// Resolution strategy for sync conflicts
enum CloudKitConflictResolution {
  case useLocal
  case useRemote
  case merge
  case keepBoth
}

// MARK: - CloudKit Record Types

private enum CloudKitRecordType {
  static let itinerary = "Itinerary"
  static let syncMetadata = "SyncMetadata"
}

private enum CloudKitField {
  // Itinerary fields
  static let id = "id"
  static let blogId = "blogId"
  static let title = "title"
  static let coverImage = "coverImage"
  static let daysData = "daysData"
  static let savedAt = "savedAt"
  static let modifiedAt = "modifiedAt"
  static let authorName = "authorName"
  static let sourcePlatform = "sourcePlatform"
  static let aiSummary = "aiSummary"
  static let aiTipsData = "aiTipsData"
  static let imageUrlsData = "imageUrlsData"
  static let destination = "destination"
  static let apiItineraryId = "apiItineraryId"
  static let copiedFromId = "copiedFromId"
  static let originalAuthorData = "originalAuthorData"
  static let copyType = "copyType"
  static let selectedDaysData = "selectedDaysData"
  static let isDeleted = "isDeleted"

  // Sync metadata fields
  static let deviceId = "deviceId"
  static let lastSyncTime = "lastSyncTime"
  static let syncVersion = "syncVersion"
}

// MARK: - CloudKit Sync Manager

/// Manages iCloud sync for itineraries using CloudKit
@MainActor
@Observable
final class CloudKitSyncManager {
  static let shared = CloudKitSyncManager()

  // MARK: - Properties

  /// Current sync status
  private(set) var syncStatus: SyncStatus = .idle

  /// Whether iCloud sync is enabled
  var isSyncEnabled: Bool {
    get { UserDefaults.standard.bool(forKey: "iCloudSyncEnabled") }
    set {
      UserDefaults.standard.set(newValue, forKey: "iCloudSyncEnabled")
      if newValue {
        Task { await startSync() }
      }
    }
  }

  /// Whether auto-sync is enabled
  var isAutoSyncEnabled: Bool {
    get { UserDefaults.standard.bool(forKey: "iCloudAutoSyncEnabled") }
    set { UserDefaults.standard.set(newValue, forKey: "iCloudAutoSyncEnabled") }
  }

  /// Last successful sync time
  private(set) var lastSyncTime: Date? {
    get {
      UserDefaults.standard.object(forKey: "iCloudLastSyncTime") as? Date
    }
    set {
      UserDefaults.standard.set(newValue, forKey: "iCloudLastSyncTime")
    }
  }

  /// Pending conflicts to resolve
  private(set) var pendingConflicts: [SyncConflict] = []

  /// iCloud account status
  private(set) var accountStatus: CKAccountStatus = .couldNotDetermine

  /// Device identifier for sync tracking
  private let deviceId: String

  /// CloudKit container
  private let container: CKContainer

  /// Private database for user data
  private var privateDatabase: CKDatabase {
    container.privateCloudDatabase
  }

  /// Zone for itinerary data
  private let itineraryZone = CKRecordZone(zoneName: "ItineraryZone")

  /// Subscription ID for change notifications
  private let subscriptionId = "itinerary-changes"

  /// Local cache of record change tokens
  private var zoneChangeToken: CKServerChangeToken? {
    get {
      guard let data = UserDefaults.standard.data(forKey: "iCloudZoneChangeToken") else { return nil }
      return try? NSKeyedUnarchiver.unarchivedObject(ofClass: CKServerChangeToken.self, from: data)
    }
    set {
      if let token = newValue,
         let data = try? NSKeyedArchiver.archivedData(withRootObject: token, requiringSecureCoding: true) {
        UserDefaults.standard.set(data, forKey: "iCloudZoneChangeToken")
      } else {
        UserDefaults.standard.removeObject(forKey: "iCloudZoneChangeToken")
      }
    }
  }

  // MARK: - Initialization

  private init() {
    // Get or create device ID
    if let existingId = UserDefaults.standard.string(forKey: "deviceSyncId") {
      deviceId = existingId
    } else {
      let newId = UUID().uuidString
      UserDefaults.standard.set(newId, forKey: "deviceSyncId")
      deviceId = newId
    }

    // Initialize CloudKit container
    container = CKContainer(identifier: "iCloud.com.sunpebble.trips")

    // Check account status
    Task {
      await checkAccountStatus()
      await setupZoneAndSubscription()
    }

    // Listen for remote change notifications
    NotificationCenter.default.addObserver(
      forName: NSNotification.Name.CKAccountChanged,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      Task { @MainActor in
        await self?.checkAccountStatus()
      }
    }
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  // MARK: - Account Status

  /// Check iCloud account status
  func checkAccountStatus() async {
    do {
      accountStatus = try await container.accountStatus()

      if AppConfig.isDebugLoggingEnabled {
        NSLog("[CloudKit] Account status: \(accountStatus.rawValue)")
      }
    } catch {
      NSLog("[CloudKit] Failed to check account status: \(error)")
      accountStatus = .couldNotDetermine
    }
  }

  /// Whether iCloud is available
  var isICloudAvailable: Bool {
    accountStatus == .available
  }

  // MARK: - Zone and Subscription Setup

  /// Setup custom zone and subscription for change notifications
  private func setupZoneAndSubscription() async {
    guard isICloudAvailable else { return }

    do {
      // Create custom zone if needed
      let zoneExists = UserDefaults.standard.bool(forKey: "iCloudZoneCreated")
      if !zoneExists {
        _ = try await privateDatabase.save(itineraryZone)
        UserDefaults.standard.set(true, forKey: "iCloudZoneCreated")
        NSLog("[CloudKit] Created custom zone: \(itineraryZone.zoneID.zoneName)")
      }

      // Create subscription for changes
      let subscriptionExists = UserDefaults.standard.bool(forKey: "iCloudSubscriptionCreated")
      if !subscriptionExists {
        let subscription = CKRecordZoneSubscription(
          zoneID: itineraryZone.zoneID,
          subscriptionID: subscriptionId
        )

        let notificationInfo = CKSubscription.NotificationInfo()
        notificationInfo.shouldSendContentAvailable = true
        subscription.notificationInfo = notificationInfo

        _ = try await privateDatabase.save(subscription)
        UserDefaults.standard.set(true, forKey: "iCloudSubscriptionCreated")
        NSLog("[CloudKit] Created subscription for zone changes")
      }
    } catch {
      NSLog("[CloudKit] Failed to setup zone/subscription: \(error)")
    }
  }

  // MARK: - Sync Operations

  /// Start a full sync operation
  func startSync() async {
    guard isSyncEnabled && isICloudAvailable else {
      if !isICloudAvailable {
        syncStatus = .error("iCloud 不可用")
      }
      return
    }

    syncStatus = .syncing

    do {
      // Fetch remote changes first
      let remoteChanges = try await fetchRemoteChanges()

      // Get local itineraries
      let localItineraries = ItineraryStore.shared.paginatedItineraries

      // Merge changes
      try await mergeChanges(local: localItineraries, remote: remoteChanges)

      // Upload local changes
      try await uploadLocalChanges()

      lastSyncTime = Date()
      syncStatus = .success(Date())

      NSLog("[CloudKit] Sync completed successfully")
    } catch {
      NSLog("[CloudKit] Sync failed: \(error)")
      syncStatus = .error(error.localizedDescription)
    }
  }

  /// Fetch changes from iCloud
  private func fetchRemoteChanges() async throws -> [SavedItinerary] {
    var fetchedItineraries: [SavedItinerary] = []

    let options = CKFetchRecordZoneChangesOperation.ZoneConfiguration()
    options.previousServerChangeToken = zoneChangeToken

    let operation = CKFetchRecordZoneChangesOperation(
      recordZoneIDs: [itineraryZone.zoneID],
      configurationsByRecordZoneID: [itineraryZone.zoneID: options]
    )

    return try await withCheckedThrowingContinuation { continuation in
      var records: [CKRecord] = []
      var deletedRecordIDs: [CKRecord.ID] = []

      operation.recordWasChangedBlock = { _, result in
        switch result {
        case .success(let record):
          records.append(record)
        case .failure(let error):
          NSLog("[CloudKit] Record fetch error: \(error)")
        }
      }

      operation.recordWithIDWasDeletedBlock = { recordId, _ in
        deletedRecordIDs.append(recordId)
      }

      operation.recordZoneChangeTokensUpdatedBlock = { [weak self] _, token, _ in
        self?.zoneChangeToken = token
      }

      operation.recordZoneFetchResultBlock = { [weak self] _, result in
        switch result {
        case .success(let (token, _, _)):
          self?.zoneChangeToken = token
        case .failure(let error):
          NSLog("[CloudKit] Zone fetch error: \(error)")
        }
      }

      operation.fetchRecordZoneChangesResultBlock = { result in
        switch result {
        case .success:
          // Convert records to itineraries
          for record in records {
            if let itinerary = self.itineraryFromRecord(record) {
              fetchedItineraries.append(itinerary)
            }
          }
          continuation.resume(returning: fetchedItineraries)
        case .failure(let error):
          continuation.resume(throwing: error)
        }
      }

      privateDatabase.add(operation)
    }
  }

  /// Merge local and remote changes
  private func mergeChanges(local: [SavedItinerary], remote: [SavedItinerary]) async throws {
    var conflicts: [SyncConflict] = []

    for remoteItinerary in remote {
      if let localItinerary = local.first(where: { $0.id == remoteItinerary.id }) {
        // Check for conflicts
        let localModified = getModifiedDate(for: localItinerary)
        let remoteModified = getModifiedDate(for: remoteItinerary)

        if localModified != remoteModified && localItinerary != remoteItinerary {
          // Conflict detected
          conflicts.append(SyncConflict(
            localItinerary: localItinerary,
            remoteItinerary: remoteItinerary,
            localModifiedAt: localModified,
            remoteModifiedAt: remoteModified
          ))
        } else if remoteModified > localModified {
          // Remote is newer, update local
          await MainActor.run {
            ItineraryStore.shared.update(remoteItinerary)
          }
        }
      } else {
        // New remote itinerary, add locally
        await MainActor.run {
          ItineraryStore.shared.addFromSync(remoteItinerary)
        }
      }
    }

    pendingConflicts = conflicts
  }

  /// Upload local changes to iCloud
  private func uploadLocalChanges() async throws {
    let localItineraries = ItineraryStore.shared.paginatedItineraries
    var recordsToSave: [CKRecord] = []

    for itinerary in localItineraries {
      let record = recordFromItinerary(itinerary)
      recordsToSave.append(record)
    }

    guard !recordsToSave.isEmpty else { return }

    let operation = CKModifyRecordsOperation(
      recordsToSave: recordsToSave,
      recordIDsToDelete: nil
    )
    operation.savePolicy = .changedKeys
    operation.qualityOfService = .userInitiated

    return try await withCheckedThrowingContinuation { continuation in
      operation.modifyRecordsResultBlock = { result in
        switch result {
        case .success:
          NSLog("[CloudKit] Uploaded \(recordsToSave.count) records")
          continuation.resume()
        case .failure(let error):
          continuation.resume(throwing: error)
        }
      }

      privateDatabase.add(operation)
    }
  }

  /// Upload a single itinerary to iCloud
  func uploadItinerary(_ itinerary: SavedItinerary) async throws {
    guard isSyncEnabled && isICloudAvailable else { return }

    let record = recordFromItinerary(itinerary)
    _ = try await privateDatabase.save(record)

    NSLog("[CloudKit] Uploaded itinerary: \(itinerary.title)")
  }

  /// Delete an itinerary from iCloud
  func deleteItinerary(_ itinerary: SavedItinerary) async throws {
    guard isSyncEnabled && isICloudAvailable else { return }

    let recordId = CKRecord.ID(
      recordName: itinerary.id.uuidString,
      zoneID: itineraryZone.zoneID
    )

    try await privateDatabase.deleteRecord(withID: recordId)

    NSLog("[CloudKit] Deleted itinerary from iCloud: \(itinerary.title)")
  }

  // MARK: - Conflict Resolution

  /// Resolve a sync conflict
  func resolveConflict(_ conflict: SyncConflict, resolution: CloudKitConflictResolution) async {
    switch resolution {
    case .useLocal:
      // Upload local version to iCloud
      do {
        try await uploadItinerary(conflict.localItinerary)
      } catch {
        NSLog("[CloudKit] Failed to upload local version: \(error)")
      }

    case .useRemote:
      // Update local with remote version
      ItineraryStore.shared.update(conflict.remoteItinerary)

    case .merge:
      // Merge both versions (combine POIs from both)
      var merged = conflict.localItinerary
      merged.days = mergeDays(conflict.localItinerary.days, conflict.remoteItinerary.days)
      ItineraryStore.shared.update(merged)
      do {
        try await uploadItinerary(merged)
      } catch {
        NSLog("[CloudKit] Failed to upload merged version: \(error)")
      }

    case .keepBoth:
      // Keep local and add remote as new
      var remoteCopy = conflict.remoteItinerary
      remoteCopy = SavedItinerary(
        id: UUID(),
        title: "\(conflict.remoteItinerary.title) (云端版本)",
        destination: conflict.remoteItinerary.destination,
        daysCount: conflict.remoteItinerary.days.count
      )
      ItineraryStore.shared.addFromSync(remoteCopy)
    }

    // Remove from pending conflicts
    pendingConflicts.removeAll { $0.id == conflict.id }
  }

  /// Merge days from two itineraries
  private func mergeDays(_ local: [AiDay], _ remote: [AiDay]) -> [AiDay] {
    var merged: [AiDay] = []
    let maxDays = max(local.count, remote.count)

    for dayNum in 1...maxDays {
      let localDay = local.first { $0.dayNumber == dayNum }
      let remoteDay = remote.first { $0.dayNumber == dayNum }

      if let localDay = localDay, let remoteDay = remoteDay {
        // Merge POIs from both days
        var mergedPois = localDay.pois
        for remotePoi in remoteDay.pois {
          if !mergedPois.contains(where: { $0.name == remotePoi.name }) {
            mergedPois.append(remotePoi)
          }
        }
        merged.append(AiDay(
          dayNumber: dayNum,
          theme: localDay.theme ?? remoteDay.theme,
          pois: mergedPois
        ))
      } else if let localDay = localDay {
        merged.append(localDay)
      } else if let remoteDay = remoteDay {
        merged.append(remoteDay)
      }
    }

    return merged
  }

  // MARK: - Record Conversion

  /// Convert SavedItinerary to CKRecord
  private func recordFromItinerary(_ itinerary: SavedItinerary) -> CKRecord {
    let recordId = CKRecord.ID(
      recordName: itinerary.id.uuidString,
      zoneID: itineraryZone.zoneID
    )
    let record = CKRecord(recordType: CloudKitRecordType.itinerary, recordID: recordId)

    record[CloudKitField.id] = itinerary.id.uuidString
    record[CloudKitField.blogId] = itinerary.blogId
    record[CloudKitField.title] = itinerary.title
    record[CloudKitField.coverImage] = itinerary.coverImage
    record[CloudKitField.savedAt] = itinerary.savedAt
    record[CloudKitField.modifiedAt] = Date()
    record[CloudKitField.authorName] = itinerary.authorName
    record[CloudKitField.sourcePlatform] = itinerary.sourcePlatform
    record[CloudKitField.aiSummary] = itinerary.aiSummary
    record[CloudKitField.destination] = itinerary.destination
    record[CloudKitField.apiItineraryId] = itinerary.apiItineraryId
    record[CloudKitField.copiedFromId] = itinerary.copiedFromId
    record[CloudKitField.copyType] = itinerary.copyType
    record[CloudKitField.isDeleted] = false

    // Encode complex types as JSON data
    if let daysData = try? JSONEncoder().encode(itinerary.days) {
      record[CloudKitField.daysData] = daysData
    }

    if let tips = itinerary.aiTips, let tipsData = try? JSONEncoder().encode(tips) {
      record[CloudKitField.aiTipsData] = tipsData
    }

    if let urls = itinerary.imageUrls, let urlsData = try? JSONEncoder().encode(urls) {
      record[CloudKitField.imageUrlsData] = urlsData
    }

    if let author = itinerary.originalAuthor, let authorData = try? JSONEncoder().encode(author) {
      record[CloudKitField.originalAuthorData] = authorData
    }

    if let selectedDays = itinerary.selectedDays, let daysData = try? JSONEncoder().encode(selectedDays) {
      record[CloudKitField.selectedDaysData] = daysData
    }

    return record
  }

  /// Convert CKRecord to SavedItinerary
  private func itineraryFromRecord(_ record: CKRecord) -> SavedItinerary? {
    guard let idString = record[CloudKitField.id] as? String,
          let id = UUID(uuidString: idString),
          record[CloudKitField.blogId] is String,
          let title = record[CloudKitField.title] as? String,
          record[CloudKitField.savedAt] is Date
    else {
      return nil
    }

    // Check if deleted
    if let isDeleted = record[CloudKitField.isDeleted] as? Bool, isDeleted {
      return nil
    }

    // Decode days
    var days: [AiDay] = []
    if let daysData = record[CloudKitField.daysData] as? Data {
      days = (try? JSONDecoder().decode([AiDay].self, from: daysData)) ?? []
    }

    // Decode tips (reserved for future use)
    if let tipsData = record[CloudKitField.aiTipsData] as? Data {
      _ = try? JSONDecoder().decode([String].self, from: tipsData)
    }

    // Decode image URLs (reserved for future use)
    if let urlsData = record[CloudKitField.imageUrlsData] as? Data {
      _ = try? JSONDecoder().decode([String].self, from: urlsData)
    }

    // Decode original author (reserved for future use)
    if let authorData = record[CloudKitField.originalAuthorData] as? Data {
      _ = try? JSONDecoder().decode(SavedItineraryOriginalAuthor.self, from: authorData)
    }

    // Decode selected days (reserved for future use)
    if let daysData = record[CloudKitField.selectedDaysData] as? Data {
      _ = try? JSONDecoder().decode([Int].self, from: daysData)
    }

    // Create itinerary using manual initialization
    var itinerary = SavedItinerary(
      id: id,
      title: title,
      destination: record[CloudKitField.destination] as? String,
      daysCount: days.count
    )

    // Set all properties
    itinerary.days = days

    return itinerary
  }

  /// Get modified date for an itinerary
  private func getModifiedDate(for itinerary: SavedItinerary) -> Date {
    // Use savedAt as the modification date for now
    // In a full implementation, we'd track modification separately
    return itinerary.savedAt
  }

  // MARK: - Background Sync

  /// Handle remote notification for sync
  func handleRemoteNotification() async {
    guard isSyncEnabled && isAutoSyncEnabled else { return }
    await startSync()
  }

  /// Schedule background sync
  func scheduleBackgroundSync() {
    // Background sync would be implemented using BGTaskScheduler
    // This is a placeholder for the implementation
    NSLog("[CloudKit] Background sync scheduled")
  }
}
