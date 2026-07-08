import Foundation

// MARK: - Chat Session Model

/// Chat session with AI travel assistant.
/// Decodes the API shape: snake_case keys, numeric id, ISO8601 dates.
struct ChatSession: Codable, Identifiable, Hashable {
  let id: Int
  let userId: Int
  let title: String
  let messageCount: Int
  let lastMessageAt: Date
  let isArchived: Bool
  let createdAt: Date

  enum CodingKeys: String, CodingKey {
    case id
    case userId = "user_id"
    case title
    case messageCount = "message_count"
    case lastMessageAt = "last_message_at"
    case isArchived = "is_archived"
    case createdAt = "created_at"
  }

  // MARK: - Computed Properties

  var lastMessageDate: Date { lastMessageAt }
  var createdDate: Date { createdAt }

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

/// Single chat message.
/// Decodes the API shape: snake_case keys, numeric id, ISO8601 dates.
struct ChatMessage: Codable, Identifiable, Hashable {
  let id: Int
  let sessionId: Int
  let role: MessageRole
  let content: String
  let createdAt: Date

  enum MessageRole: String, Codable {
    case user
    case assistant
    case system
  }

  enum CodingKeys: String, CodingKey {
    case id
    case sessionId = "session_id"
    case role
    case content
    case createdAt = "created_at"
  }

  // MARK: - Computed Properties

  var createdDate: Date { createdAt }

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

// MARK: - Chat Response (stateless quick chat, /chat/query)

struct ChatResponse: Codable {
  let content: String
}

// MARK: - API Response Types

/// Session list response — `{ data: [ChatSession] }`
struct ChatSessionListResponse: Codable {
  let data: [ChatSession]
}

/// Single session response — `{ data: ChatSession }`
struct ChatSessionResponse: Codable {
  let data: ChatSession?
}

/// Message list response — `{ data: [ChatMessage] }`
struct ChatMessageListResponse: Codable {
  let data: [ChatMessage]
}

/// Send message response — `{ data: { user_message, assistant_message } }`
struct SendMessageResponse: Codable {
  let data: SendMessageData

  struct SendMessageData: Codable {
    let userMessage: ChatMessage
    let assistantMessage: ChatMessage

    enum CodingKeys: String, CodingKey {
      case userMessage = "user_message"
      case assistantMessage = "assistant_message"
    }
  }
}

/// Direct chat query response — `{ data: ChatResponse }`
struct ChatQueryResponse: Codable {
  let data: ChatResponse
}

/// Create session response — `{ data: ChatSession }`
struct CreateSessionResponse: Codable {
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
