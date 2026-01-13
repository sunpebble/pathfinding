import Foundation
import Observation
import UIKit

/// 行程存储管理器 - 使用 UserDefaults 持久化
@MainActor
@Observable
final class ItineraryStore {
  static let shared = ItineraryStore()

  private let key = "savedItineraries"

  // MARK: - Properties

  /// All itineraries (loaded from persistence)
  private var allItineraries: [SavedItinerary] = []

  /// Currently loaded itineraries (for lazy loading)
  var paginatedItineraries: [SavedItinerary] = []

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

  private init() {
    load()
    loadInitialBatch()
    setupMemoryWarningObserver()
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
  }

  // MARK: - Memory Management

  /// Setup memory warning observer
  private func setupMemoryWarningObserver() {
    NotificationCenter.default.addObserver(
      forName: UIApplication.didReceiveMemoryWarningNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      self?.clearCache()
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
