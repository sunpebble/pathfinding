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
