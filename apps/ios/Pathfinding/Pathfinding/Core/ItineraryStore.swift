import Foundation
import Observation
import UIKit
import WidgetKit

/// 行程存储管理器 - 使用 UserDefaults 持久化，支持 iCloud 同步
@MainActor
@Observable
final class ItineraryStore {
  static let shared = ItineraryStore()

  private let key = "savedItineraries"
  private let modificationDatesKey = "itineraryModificationDates"

  // MARK: - Properties

  /// All itineraries (loaded from persistence)
  private var allItineraries: [SavedItinerary] = []

  /// Currently loaded itineraries (for lazy loading)
  var paginatedItineraries: [SavedItinerary] = []

  /// Modification dates for conflict detection
  private var modificationDates: [UUID: Date] = [:]

  /// Legacy property for backward compatibility
  var itineraries: [SavedItinerary] {
    get { paginatedItineraries }
    set { paginatedItineraries = newValue }
  }

  /// Current loaded count
  private var loadedCount: Int = 0

  /// Check if there are more itineraries to load
  var hasMoreToLoad: Bool {
    loadedCount < allItineraries.count
  }

  /// Whether sync is in progress
  private(set) var isSyncing: Bool = false

  private init() {
    load()
    loadModificationDates()
    loadInitialBatch()
    setupMemoryWarningObserver()
    setupiCloudSyncObserver()

    // Sync widget data on app launch
    syncWidgetData()
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }

  // MARK: - Lazy Loading

  /// Load initial batch of itineraries
  private func loadInitialBatch() {
    loadedCount = 0
    paginatedItineraries = []
    loadBatch()
  }

  /// Load next batch of itineraries
  func loadBatch() {
    let batchSize = AppConfig.maxItineraryLoadBatch
    let endIndex = min(loadedCount + batchSize, allItineraries.count)

    guard loadedCount < endIndex else { return }

    let batch = Array(allItineraries[loadedCount..<endIndex])
    paginatedItineraries.append(contentsOf: batch)
    loadedCount = endIndex
  }

  /// Reload all itineraries (useful after modifications)
  func reloadAll() {
    loadInitialBatch()
  }

  // MARK: - CRUD Operations

  /// 从攻略保存行程
  func save(from guide: BlogPost) {
    // 检查是否已保存过
    guard !allItineraries.contains(where: { $0.blogId == guide.id }) else { return }

    let itinerary = SavedItinerary(from: guide)
    allItineraries.insert(itinerary, at: 0)
    persist()
    reloadAll()
  }

  /// 检查是否已保存
  func isSaved(blogId: String) -> Bool {
    allItineraries.contains { $0.blogId == blogId }
  }

  /// 删除行程
  func delete(id: UUID) {
    allItineraries.removeAll { $0.id == id }
    persist()
    reloadAll()
  }

  /// 删除行程 (通过索引)
  func delete(at offsets: IndexSet) {
    // Remove from paginated array to get correct IDs
    let itemsToDelete = offsets.map { paginatedItineraries[$0] }
    let idsToDelete = Set(itemsToDelete.map { $0.id })

    // Remove from all itineraries
    allItineraries.removeAll { idsToDelete.contains($0.id) }
    persist()
    reloadAll()
  }

  /// 更新行程
  func update(_ itinerary: SavedItinerary) {
    if let index = allItineraries.firstIndex(where: { $0.id == itinerary.id }) {
      allItineraries[index] = itinerary
      persist()
      reloadAll()
    }
  }

  // MARK: - Copy Operations

  /// 复制行程（完整复制）- 本地存储
  /// - Parameters:
  ///   - itinerary: 要复制的行程
  ///   - newStartDate: 新行程的开始日期
  /// - Returns: 复制后的新行程
  @discardableResult
  func copyItinerary(_ itinerary: SavedItinerary, newStartDate: Date) -> SavedItinerary {
    var newItinerary = itinerary
    newItinerary = SavedItinerary(
      id: UUID(),
      title: "\(itinerary.title) (副本)",
      destination: itinerary.destination,
      daysCount: itinerary.days.count
    )

    // Copy days with adjusted dates
    newItinerary.days = itinerary.days

    // Update metadata
    var mutableItinerary = newItinerary
    mutableItinerary.days = itinerary.days

    allItineraries.insert(mutableItinerary, at: 0)
    persist()
    reloadAll()

    return mutableItinerary
  }

  /// 部分复制行程（选择特定天数）- 本地存储
  /// - Parameters:
  ///   - itinerary: 要复制的行程
  ///   - selectedDays: 选择的天数（1-based）
  ///   - newStartDate: 新行程的开始日期
  ///   - newTitle: 可选的新标题
  /// - Returns: 复制后的新行程
  @discardableResult
  func copyItineraryPartial(
    _ itinerary: SavedItinerary,
    selectedDays: [Int],
    newStartDate: Date,
    newTitle: String? = nil
  ) -> SavedItinerary {
    // Filter and renumber selected days
    let filteredDays = itinerary.days
      .filter { selectedDays.contains($0.dayNumber) }
      .enumerated()
      .map { index, day in
        var newDay = day
        newDay.dayNumber = index + 1
        return newDay
      }

    var newItinerary = SavedItinerary(
      id: UUID(),
      title: newTitle ?? "\(itinerary.title) (部分副本)",
      destination: itinerary.destination,
      daysCount: filteredDays.count
    )
    newItinerary.days = filteredDays

    allItineraries.insert(newItinerary, at: 0)
    persist()
    reloadAll()

    return newItinerary
  }

  /// 从BlogPost复制行程 - 本地存储
  /// - Parameters:
  ///   - guide: 要复制的攻略
  ///   - selectedDays: 可选的选择天数（nil表示全部复制）
  ///   - newStartDate: 新行程的开始日期
  /// - Returns: 复制后的新行程
  @discardableResult
  func copyFromGuide(
    _ guide: BlogPost,
    selectedDays: [Int]? = nil,
    newStartDate: Date
  ) -> SavedItinerary {
    var itinerary = SavedItinerary(from: guide)

    // If partial copy, filter days
    if let selectedDays = selectedDays, !selectedDays.isEmpty {
      let filteredDays = itinerary.days
        .filter { selectedDays.contains($0.dayNumber) }
        .enumerated()
        .map { index, day in
          var newDay = day
          newDay.dayNumber = index + 1
          return newDay
        }
      itinerary.days = filteredDays
    }

    // Generate new ID to allow multiple copies
    let newItinerary = SavedItinerary(
      id: UUID(),
      title: selectedDays != nil ? "\(guide.title) (部分)" : guide.title,
      destination: itinerary.destination,
      daysCount: itinerary.days.count
    )
    var mutableItinerary = newItinerary
    mutableItinerary.days = itinerary.days

    allItineraries.insert(mutableItinerary, at: 0)
    persist()
    reloadAll()

    return mutableItinerary
  }

  // MARK: - API Copy Operations

  /// 从API复制公开行程（完整复制）
  /// - Parameters:
  ///   - itineraryId: API行程ID
  ///   - newStartDate: 新行程的开始日期
  /// - Returns: 复制后的新行程
  func copyItineraryFromAPI(
    itineraryId: String,
    newStartDate: Date
  ) async throws -> SavedItinerary {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    let startDateString = dateFormatter.string(from: newStartDate)

    let apiItinerary = try await APIClient.shared.copyItinerary(
      itineraryId: itineraryId,
      newStartDate: startDateString
    )

    var newItinerary = SavedItinerary(from: apiItinerary)
    newItinerary.copyType = "full"

    allItineraries.insert(newItinerary, at: 0)
    persist()
    reloadAll()

    return newItinerary
  }

  /// 从API部分复制公开行程
  /// - Parameters:
  ///   - itineraryId: API行程ID
  ///   - newStartDate: 新行程的开始日期
  ///   - selectedDays: 选择的天数（1-based）
  ///   - newTitle: 可选的新标题
  /// - Returns: 复制后的新行程
  func copyItineraryPartialFromAPI(
    itineraryId: String,
    newStartDate: Date,
    selectedDays: [Int],
    newTitle: String? = nil
  ) async throws -> SavedItinerary {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    let startDateString = dateFormatter.string(from: newStartDate)

    let apiItinerary = try await APIClient.shared.copyItineraryPartial(
      itineraryId: itineraryId,
      newStartDate: startDateString,
      selectedDays: selectedDays,
      newTitle: newTitle
    )

    var newItinerary = SavedItinerary(from: apiItinerary)
    newItinerary.copyType = "partial"
    newItinerary.selectedDays = selectedDays

    allItineraries.insert(newItinerary, at: 0)
    persist()
    reloadAll()

    return newItinerary
  }

  /// 获取用户的复制历史
  /// - Parameters:
  ///   - page: 页码
  ///   - pageSize: 每页数量
  /// - Returns: 复制历史结果
  func getCopyHistory(page: Int = 1, pageSize: Int = 20) async throws -> CopyHistoryResult {
    return try await APIClient.shared.getCopyHistory(page: page, pageSize: pageSize)
  }

  /// 获取行程的复制统计
  /// - Parameter itineraryId: 行程ID
  /// - Returns: 复制统计数据
  func getCopyStats(itineraryId: String) async throws -> ItineraryCopyStats {
    return try await APIClient.shared.getItineraryCopyStats(itineraryId: itineraryId)
  }

  /// 获取公开行程列表用于发现
  /// - Parameters:
  ///   - cityId: 城市ID过滤
  ///   - page: 页码
  ///   - pageSize: 每页数量
  ///   - sortBy: 排序方式
  /// - Returns: 公开行程结果
  func getPublicItineraries(
    cityId: String? = nil,
    page: Int = 1,
    pageSize: Int = 20,
    sortBy: String = "created_at"
  ) async throws -> PublicItinerariesResult {
    return try await APIClient.shared.listPublicItineraries(
      cityId: cityId,
      page: page,
      pageSize: pageSize,
      sortBy: sortBy
    )
  }
  
  // MARK: - Persistence

  private func load() {
    guard let data = UserDefaults.standard.data(forKey: key),
          let decoded = try? JSONDecoder().decode([SavedItinerary].self, from: data)
    else { return }
    allItineraries = decoded
  }

  private func persist() {
    guard let data = try? JSONEncoder().encode(allItineraries) else { return }
    UserDefaults.standard.set(data, forKey: key)
    persistModificationDates()

    // Sync widget data whenever itineraries change
    syncWidgetData()
  }

  /// Sync data to widgets
  private func syncWidgetData() {
    WidgetDataManager.shared.syncAllWidgetData(itineraries: allItineraries)
  }

  /// Load modification dates from persistence
  private func loadModificationDates() {
    guard let data = UserDefaults.standard.data(forKey: modificationDatesKey),
          let decoded = try? JSONDecoder().decode([String: Date].self, from: data)
    else { return }
    modificationDates = Dictionary(uniqueKeysWithValues: decoded.compactMap { key, value in
      guard let uuid = UUID(uuidString: key) else { return nil }
      return (uuid, value)
    })
  }

  /// Persist modification dates
  private func persistModificationDates() {
    let stringKeyed = Dictionary(uniqueKeysWithValues: modificationDates.map { ($0.key.uuidString, $0.value) })
    guard let data = try? JSONEncoder().encode(stringKeyed) else { return }
    UserDefaults.standard.set(data, forKey: modificationDatesKey)
  }

  /// Get modification date for an itinerary
  func getModificationDate(for id: UUID) -> Date? {
    modificationDates[id]
  }

  /// Update modification date for an itinerary
  func updateModificationDate(for id: UUID) {
    modificationDates[id] = Date()
    persistModificationDates()
  }

  // MARK: - iCloud Sync

  /// Setup iCloud sync observer
  private func setupiCloudSyncObserver() {
    // Listen for NSUbiquitousKeyValueStore changes (for basic sync)
    NotificationCenter.default.addObserver(
      forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
      object: NSUbiquitousKeyValueStore.default,
      queue: .main
    ) { [weak self] _ in
      Task { @MainActor in
        self?.handleiCloudChange()
      }
    }

    // Start syncing with NSUbiquitousKeyValueStore
    NSUbiquitousKeyValueStore.default.synchronize()
  }

  /// Handle iCloud key-value store changes
  private func handleiCloudChange() {
    let userInfo = NSUbiquitousKeyValueStore.default.dictionaryRepresentation
    guard let reasonValue = userInfo[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int
    else {
      // Just sync from iCloud if we can't determine the reason
      Task {
        await syncFromiCloud()
      }
      return
    }

    switch reasonValue {
    case NSUbiquitousKeyValueStoreServerChange, NSUbiquitousKeyValueStoreInitialSyncChange:
      // Reload data from iCloud
      Task {
        await syncFromiCloud()
      }
    case NSUbiquitousKeyValueStoreQuotaViolationChange:
      NSLog("[iCloud] Quota exceeded, cannot sync")
    case NSUbiquitousKeyValueStoreAccountChange:
      NSLog("[iCloud] Account changed, resyncing")
      Task {
        await syncFromiCloud()
      }
    default:
      break
    }
  }

  /// Sync itineraries from iCloud (using CloudKit)
  func syncFromiCloud() async {
    guard CloudKitSyncManager.shared.isSyncEnabled else { return }

    isSyncing = true
    defer { isSyncing = false }

    await CloudKitSyncManager.shared.startSync()
    load()
    reloadAll()
  }

  /// Trigger manual sync to iCloud
  func syncToiCloud() async {
    guard CloudKitSyncManager.shared.isSyncEnabled else { return }

    isSyncing = true
    defer { isSyncing = false }

    await CloudKitSyncManager.shared.startSync()
  }

  /// Add itinerary from sync (without triggering another sync)
  func addFromSync(_ itinerary: SavedItinerary) {
    // Check if already exists
    guard !allItineraries.contains(where: { $0.id == itinerary.id }) else {
      // Update existing
      if let index = allItineraries.firstIndex(where: { $0.id == itinerary.id }) {
        allItineraries[index] = itinerary
        modificationDates[itinerary.id] = Date()
      }
      persist()
      reloadAll()
      return
    }

    // Add new itinerary
    allItineraries.insert(itinerary, at: 0)
    modificationDates[itinerary.id] = Date()
    persist()
    reloadAll()
  }

  /// Save itinerary with iCloud sync
  func saveWithSync(from guide: BlogPost) async {
    // Check if already saved
    guard !allItineraries.contains(where: { $0.blogId == guide.id }) else { return }

    let itinerary = SavedItinerary(from: guide)
    allItineraries.insert(itinerary, at: 0)
    modificationDates[itinerary.id] = Date()
    persist()
    reloadAll()

    // Sync to iCloud
    if CloudKitSyncManager.shared.isSyncEnabled {
      do {
        try await CloudKitSyncManager.shared.uploadItinerary(itinerary)
      } catch {
        NSLog("[iCloud] Failed to sync new itinerary: \(error)")
      }
    }
  }

  /// Update itinerary with iCloud sync
  func updateWithSync(_ itinerary: SavedItinerary) async {
    if let index = allItineraries.firstIndex(where: { $0.id == itinerary.id }) {
      allItineraries[index] = itinerary
      modificationDates[itinerary.id] = Date()
      persist()
      reloadAll()

      // Sync to iCloud
      if CloudKitSyncManager.shared.isSyncEnabled {
        do {
          try await CloudKitSyncManager.shared.uploadItinerary(itinerary)
        } catch {
          NSLog("[iCloud] Failed to sync updated itinerary: \(error)")
        }
      }
    }
  }

  /// Delete itinerary with iCloud sync
  func deleteWithSync(id: UUID) async {
    guard let itinerary = allItineraries.first(where: { $0.id == id }) else { return }

    allItineraries.removeAll { $0.id == id }
    modificationDates.removeValue(forKey: id)
    persist()
    reloadAll()

    // Sync deletion to iCloud
    if CloudKitSyncManager.shared.isSyncEnabled {
      do {
        try await CloudKitSyncManager.shared.deleteItinerary(itinerary)
      } catch {
        NSLog("[iCloud] Failed to sync deletion: \(error)")
      }
    }
  }

  // MARK: - Memory Management

  /// Setup memory warning observer
  private func setupMemoryWarningObserver() {
    NotificationCenter.default.addObserver(
      forName: UIApplication.didReceiveMemoryWarningNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      Task { @MainActor in
        self?.clearCache()
      }
    }
  }

  /// Clear cached data to free memory
  func clearCache() {
    // Clear paginated data but keep allItineraries (backed by UserDefaults)
    paginatedItineraries = []
    loadedCount = 0

    // Reload initial batch to maintain functionality
    loadInitialBatch()
  }
}

// MARK: - DEBUG Test Helpers

#if DEBUG
extension ItineraryStore {
  /// Generate test itinerary with specified number of POIs for performance testing
  /// - Parameter poiCount: Number of POIs to generate (e.g., 100 for stress testing)
  func generateTestItinerary(poiCount: Int) {
    let daysCount = max(1, (poiCount + 9) / 10) // ~10 POIs per day

    let testItinerary = SavedItinerary(
      title: "🧪 Test Itinerary - \(poiCount) POIs",
      destination: "Performance Test Location",
      daysCount: daysCount
    )

    // Generate POIs for each day
    var currentItinerary = testItinerary
    currentItinerary.days = generateTestDays(poiCount: poiCount, daysCount: daysCount)

    allItineraries.insert(currentItinerary, at: 0)
    persist()
    reloadAll()

    NSLog("[TestData] Generated itinerary with \(poiCount) POIs across \(daysCount) days")
  }

  /// Generate test days with POIs distributed across them
  private func generateTestDays(poiCount: Int, daysCount: Int) -> [AiDay] {
    var days: [AiDay] = []
    var remainingPOIs = poiCount
    let poisPerDay = max(1, poiCount / daysCount)

    for dayNum in 1...daysCount {
      let poisForThisDay = min(remainingPOIs, dayNum == daysCount ? remainingPOIs : poisPerDay)
      let pois = generateTestPOIs(count: poisForThisDay, dayNumber: dayNum)

      days.append(AiDay(
        dayNumber: dayNum,
        theme: "Day \(dayNum) - \(poisForThisDay) locations",
        pois: pois
      ))

      remainingPOIs -= poisForThisDay
      if remainingPOIs <= 0 { break }
    }

    return days
  }

  /// Generate test POIs with realistic data
  private func generateTestPOIs(count: Int, dayNumber: Int) -> [AiPoi] {
    let poiTypes = ["attraction", "restaurant", "hotel", "transportation", "shopping"]
    let baseLatitude = 31.23 // Shanghai area
    let baseLongitude = 121.47

    return (1...count).map { poiNum in
      let poiType = poiTypes[poiNum % poiTypes.count]
      let hasDescription = poiNum % 3 == 0 // Some POIs have descriptions

      return AiPoi(
        name: "\(poiType.capitalized) \(dayNumber)-\(poiNum)",
        type: poiType,
        description: hasDescription ? "This is a test \(poiType) for performance testing. It includes a longer description to simulate real-world data." : nil,
        latitude: baseLatitude + Double(dayNumber) * 0.01 + Double(poiNum) * 0.002,
        longitude: baseLongitude + Double(dayNumber) * 0.015 + Double(poiNum) * 0.003,
        address: "Test Street \(poiNum), District \(dayNumber), Test City"
      )
    }
  }

  /// Clear all test itineraries (those with 🧪 prefix)
  func clearTestItineraries() {
    let beforeCount = allItineraries.count
    allItineraries.removeAll { $0.title.hasPrefix("🧪") }
    let removedCount = beforeCount - allItineraries.count

    if removedCount > 0 {
      persist()
      reloadAll()
      NSLog("[TestData] Removed \(removedCount) test itineraries")
    }
  }
}
#endif
