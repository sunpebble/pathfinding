import Foundation
import Observation

/// 行程存储管理器 - 使用 UserDefaults 持久化
@MainActor
@Observable
final class ItineraryStore {
  static let shared = ItineraryStore()
  
  private let key = "savedItineraries"
  
  var itineraries: [SavedItinerary] = []
  
  private init() {
    load()
  }
  
  /// 从攻略保存行程
  func save(from guide: BlogPost) {
    // 检查是否已保存过
    guard !itineraries.contains(where: { $0.blogId == guide.id }) else { return }
    
    let itinerary = SavedItinerary(from: guide)
    itineraries.insert(itinerary, at: 0)
    persist()
  }
  
  /// 检查是否已保存
  func isSaved(blogId: String) -> Bool {
    itineraries.contains { $0.blogId == blogId }
  }
  
  /// 删除行程
  func delete(id: UUID) {
    itineraries.removeAll { $0.id == id }
    persist()
  }
  
  /// 删除行程 (通过索引)
  func delete(at offsets: IndexSet) {
    itineraries.remove(atOffsets: offsets)
    persist()
  }
  
  /// 更新行程
  func update(_ itinerary: SavedItinerary) {
    if let index = itineraries.firstIndex(where: { $0.id == itinerary.id }) {
      itineraries[index] = itinerary
      persist()
    }
  }
  
  // MARK: - Persistence
  
  private func load() {
    guard let data = UserDefaults.standard.data(forKey: key),
          let decoded = try? JSONDecoder().decode([SavedItinerary].self, from: data)
    else { return }
    itineraries = decoded
  }
  
  private func persist() {
    guard let data = try? JSONEncoder().encode(itineraries) else { return }
    UserDefaults.standard.set(data, forKey: key)
  }
}
