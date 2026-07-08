import Foundation

// MARK: - AI Day

/// AI-extracted day structure
struct AiDay: Codable, Identifiable, Hashable {
  var id: Int { dayNumber }
  var dayNumber: Int
  var theme: String?
  var pois: [AiPoi]

  enum CodingKeys: String, CodingKey {
    case dayNumber = "day_number"
    case theme
    case pois
  }

  // Hashable conformance for var properties
  func hash(into hasher: inout Hasher) {
    hasher.combine(dayNumber)
    hasher.combine(theme)
    hasher.combine(pois)
  }
  
  static func == (lhs: AiDay, rhs: AiDay) -> Bool {
    lhs.dayNumber == rhs.dayNumber && lhs.pois == rhs.pois && lhs.theme == rhs.theme
  }
}

// MARK: - AI POI

/// AI-extracted point of interest with enhanced metadata
struct AiPoi: Codable, Identifiable, Hashable {
  var id: String = UUID().uuidString
  var name: String
  var type: String?
  var description: String?
  var latitude: Double?
  var longitude: Double?
  var address: String?
  var time: String? // User-added time

  // Enhanced POI metadata
  var duration: String? // 推荐停留时长
  var priceInfo: String? // 门票/人均消费
  var openingHours: String? // 营业时间
  var tips: String? // 针对该POI的特别提示
  var rating: Double? // 1-5 评分
  var highlights: [String]? // 亮点/特色
  var transportToNext: TransportInfo? // 到下一个POI的交通信息

  enum CodingKeys: String, CodingKey {
    case name, type, description, latitude, longitude, address, time
    case duration
    case priceInfo = "price_info"
    case openingHours = "opening_hours"
    case tips, rating, highlights
    case transportToNext = "transport_to_next"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: AiPoi, rhs: AiPoi) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Transport Info

/// Transportation information to next POI
struct TransportInfo: Codable, Hashable {
  var mode: String? // walking, driving, transit, taxi
  var duration: String? // 时间估计
  var distance: String? // 距离
  var notes: String? // 交通备注
}
