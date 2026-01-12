import Foundation

/// 保存的行程数据模型
struct SavedItinerary: Identifiable, Codable {
  let id: UUID
  let blogId: String
  var title: String
  let coverImage: String?
  var days: [AiDay]
  let savedAt: Date
  let authorName: String?
  let sourcePlatform: String?
  let aiSummary: String?
  let aiTips: [String]?
  let imageUrls: [String]?
  var destination: String?
  
  init(id: UUID = UUID(), from guide: BlogPost) {
    self.id = id
    self.blogId = guide.id
    self.title = guide.title
    self.coverImage = guide.coverImage
    self.days = guide.aiDays ?? []
    self.savedAt = Date()
    self.authorName = guide.authorName
    self.sourcePlatform = guide.sourcePlatform
    self.aiSummary = guide.aiSummary
    self.aiTips = guide.aiTips
    self.imageUrls = guide.imageUrls
    self.destination = nil // Default nil for imported
  }

  init(id: UUID = UUID(), title: String, destination: String?, daysCount: Int) {
    self.id = id
    self.blogId = "manual-\(id.uuidString)"
    self.title = title
    self.destination = destination
    self.coverImage = nil
    self.days = (1...max(1, daysCount)).map { AiDay(dayNumber: $0, theme: nil, pois: []) }
    self.savedAt = Date()
    self.authorName = "我自己"
    self.sourcePlatform = nil
    self.aiSummary = nil
    self.aiTips = nil
    self.imageUrls = nil
  }
}
