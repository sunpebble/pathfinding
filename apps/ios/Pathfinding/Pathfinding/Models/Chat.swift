import Foundation

// MARK: - Chat Session Model

/// Chat session with AI travel assistant
struct ChatSession: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let title: String
  let itineraryId: String?
  let guideId: String?
  let context: String?
  let messageCount: Int
  let lastMessageAt: Double
  let isArchived: Bool
  let createdAt: Double

  // Enriched fields from server
  let itinerary: LinkedItinerary?
  let guide: LinkedGuide?

  struct LinkedItinerary: Codable, Hashable {
    let id: String
    let title: String
  }

  struct LinkedGuide: Codable, Hashable {
    let id: String
    let title: String
  }

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "userId"
    case title
    case itineraryId = "itineraryId"
    case guideId = "guideId"
    case context
    case messageCount = "messageCount"
    case lastMessageAt = "lastMessageAt"
    case isArchived = "isArchived"
    case createdAt = "createdAt"
    case itinerary
    case guide
  }

  // MARK: - Computed Properties

  var lastMessageDate: Date {
    Date(timeIntervalSince1970: lastMessageAt / 1000)
  }

  var createdDate: Date {
    Date(timeIntervalSince1970: createdAt / 1000)
  }

  var timeAgo: String {
    lastMessageDate.relativeFormatted(localeIdentifier: nil)
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: ChatSession, rhs: ChatSession) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Chat Message Model

/// Single chat message
struct ChatMessage: Codable, Identifiable, Hashable {
  let id: String
  let sessionId: String
  let role: MessageRole
  let content: String
  let metadata: MessageMetadata?
  let createdAt: Double

  enum MessageRole: String, Codable {
    case user
    case assistant
    case system
  }

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case sessionId = "sessionId"
    case role
    case content
    case metadata
    case createdAt = "createdAt"
  }

  // MARK: - Computed Properties

  var createdDate: Date {
    Date(timeIntervalSince1970: createdAt / 1000)
  }

  var timeString: String {
    let formatter = DateFormatter()
    formatter.timeStyle = .short
    return formatter.string(from: createdDate)
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: ChatMessage, rhs: ChatMessage) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Message Metadata

/// Rich metadata in assistant responses
struct MessageMetadata: Codable, Hashable {
  let pois: [RecommendedPoi]?
  let itineraryChanges: [ItineraryChange]?
  let quickActions: [QuickAction]?
  let sources: [String]?

  struct RecommendedPoi: Codable, Hashable, Identifiable {
    var id: String { name }
    let name: String
    let type: String
    let description: String?
    let latitude: Double?
    let longitude: Double?
    let address: String?
    let rating: Double?
    let priceInfo: String?

    var typeIcon: String {
      switch type.lowercased() {
      case "attraction", "scenic_spot":
        return "mappin.circle.fill"
      case "restaurant", "food":
        return "fork.knife"
      case "hotel", "accommodation":
        return "bed.double.fill"
      case "shopping":
        return "bag.fill"
      case "cafe":
        return "cup.and.saucer.fill"
      case "museum":
        return "building.columns.fill"
      case "park":
        return "leaf.fill"
      case "entertainment":
        return "theatermasks.fill"
      default:
        return "mappin"
      }
    }
  }

  struct ItineraryChange: Codable, Hashable, Identifiable {
    var id: String { "\(action)-\(poiName ?? "")-\(dayNumber ?? 0)" }
    let action: String
    let dayNumber: Int?
    let poiName: String?
    let details: String?

    enum CodingKeys: String, CodingKey {
      case action
      case dayNumber = "dayNumber"
      case poiName = "poiName"
      case details
    }

    var actionIcon: String {
      switch action.lowercased() {
      case "add":
        return "plus.circle.fill"
      case "remove":
        return "minus.circle.fill"
      case "modify":
        return "pencil.circle.fill"
      case "reorder":
        return "arrow.up.arrow.down.circle.fill"
      default:
        return "circle.fill"
      }
    }

    var actionColor: String {
      switch action.lowercased() {
      case "add":
        return "green"
      case "remove":
        return "red"
      case "modify":
        return "orange"
      case "reorder":
        return "blue"
      default:
        return "gray"
      }
    }
  }

  struct QuickAction: Codable, Hashable, Identifiable {
    var id: String { "\(action)-\(label)" }
    let label: String
    let action: String
    let payload: String?

    var actionIcon: String {
      switch action.lowercased() {
      case "search_poi":
        return "magnifyingglass"
      case "modify_itinerary":
        return "pencil"
      case "get_tips":
        return "lightbulb.fill"
      case "create_itinerary":
        return "plus.circle.fill"
      case "show_map":
        return "map.fill"
      case "get_weather":
        return "cloud.sun.fill"
      default:
        return "arrow.right.circle.fill"
      }
    }
  }
}

// MARK: - Chat Response (from AI)

struct ChatResponse: Codable {
  let content: String
  let metadata: MessageMetadata?
}

// MARK: - API Response Types

/// Session list response
struct ChatSessionListResponse: Codable {
  let success: Bool
  let data: [ChatSession]
}

/// Single session response
struct ChatSessionResponse: Codable {
  let success: Bool
  let data: ChatSession?
}

/// Message list response
struct ChatMessageListResponse: Codable {
  let success: Bool
  let data: [ChatMessage]
  let cursor: String?
  let isDone: Bool
}

/// Send message response
struct SendMessageResponse: Codable {
  let success: Bool
  let data: SendMessageData

  struct SendMessageData: Codable {
    let userMessageId: String
    let response: ChatResponse
  }
}

/// Direct chat query response
struct ChatQueryResponse: Codable {
  let success: Bool
  let data: ChatResponse
}

/// Create session response
struct CreateSessionResponse: Codable {
  let success: Bool
  let data: ChatSession?
}

// MARK: - Request Types

/// Context for chat requests
struct ChatContext: Encodable {
  var itinerary: ItineraryContext?
  var guide: GuideContext?
  var sessionContext: String?
  var preferences: Preferences?

  struct ItineraryContext: Encodable {
    let title: String
    let cityName: String?
    let startDate: String
    let endDate: String
    let days: [DayContext]?

    struct DayContext: Encodable {
      let dayNumber: Int
      let date: String
      let items: [ItemContext]

      struct ItemContext: Encodable {
        let poiName: String?
        let poiCategory: String?
        let startTime: String?
        let endTime: String?
        let notes: String?
      }
    }
  }

  struct GuideContext: Encodable {
    let title: String?
    let destinations: [String]?
    let aiSummary: String?
    let aiTips: [String]?
    let aiBestTime: String?
    let aiDuration: String?
    let aiBudget: String?
  }

  struct Preferences: Encodable {
    let language: String?
    let travelStyle: String?
    let budget: String?
  }
}

// MARK: - Quick Reply Suggestions

enum QuickReplySuggestion: String, CaseIterable, Identifiable {
  case recommendRestaurant = "recommend_restaurant"
  case recommendAttraction = "recommend_attraction"
  case getTips = "get_tips"
  case optimizeRoute = "optimize_route"
  case checkWeather = "check_weather"

  var id: String { rawValue }

  var displayText: String {
    switch self {
    case .recommendRestaurant:
      return "Recommend restaurants"
    case .recommendAttraction:
      return "Recommend attractions"
    case .getTips:
      return "Travel tips"
    case .optimizeRoute:
      return "Optimize route"
    case .checkWeather:
      return "Check weather"
    }
  }

  var chineseText: String {
    switch self {
    case .recommendRestaurant:
      return "推荐附近餐厅"
    case .recommendAttraction:
      return "推荐热门景点"
    case .getTips:
      return "旅行小贴士"
    case .optimizeRoute:
      return "优化路线"
    case .checkWeather:
      return "查看天气"
    }
  }

  var icon: String {
    switch self {
    case .recommendRestaurant:
      return "fork.knife"
    case .recommendAttraction:
      return "star.fill"
    case .getTips:
      return "lightbulb.fill"
    case .optimizeRoute:
      return "map.fill"
    case .checkWeather:
      return "cloud.sun.fill"
    }
  }
}
