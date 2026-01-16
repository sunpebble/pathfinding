import Foundation

// MARK: - Question Model

/// POI question model for community Q&A
struct POIQuestion: Codable, Identifiable, Hashable {
  let id: String
  let poiId: String
  let userId: String
  let title: String
  let content: String
  let authorName: String?
  let authorAvatarUrl: String?
  let upvotesCount: Int
  let downvotesCount: Int
  let answersCount: Int
  let viewsCount: Int
  let bestAnswerId: String?
  let hasBestAnswer: Bool
  let status: QuestionStatus
  let isEdited: Bool
  let isDeleted: Bool
  let tags: [String]?
  let createdAt: Double
  let updatedAt: Double?
  let lastActivityAt: Double

  // Enriched fields from server
  var userVote: VoteType?
  let poiName: String?

  enum QuestionStatus: String, Codable {
    case open
    case closed
    case resolved
  }

  enum CodingKeys: String, CodingKey {
    case id
    case poiId = "poi_id"
    case userId = "user_id"
    case title
    case content
    case authorName = "author_name"
    case authorAvatarUrl = "author_avatar_url"
    case upvotesCount = "upvotes_count"
    case downvotesCount = "downvotes_count"
    case answersCount = "answers_count"
    case viewsCount = "views_count"
    case bestAnswerId = "best_answer_id"
    case hasBestAnswer = "has_best_answer"
    case status
    case isEdited = "is_edited"
    case isDeleted = "is_deleted"
    case tags
    case createdAt = "created_at"
    case updatedAt = "updated_at"
    case lastActivityAt = "last_activity_at"
    case userVote = "user_vote"
    case poiName = "poi_name"
  }

  // MARK: - Computed Properties

  var createdDate: Date {
    Date(timeIntervalSince1970: createdAt / 1000)
  }

  var updatedDate: Date? {
    guard let updatedAt else { return nil }
    return Date(timeIntervalSince1970: updatedAt / 1000)
  }

  var lastActivityDate: Date {
    Date(timeIntervalSince1970: lastActivityAt / 1000)
  }

  var timeAgo: String {
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .short
    return formatter.localizedString(for: createdDate, relativeTo: Date())
  }

  var score: Int {
    upvotesCount - downvotesCount
  }

  var statusIcon: String {
    switch status {
    case .open:
      return "questionmark.circle"
    case .closed:
      return "xmark.circle"
    case .resolved:
      return "checkmark.circle.fill"
    }
  }

  var statusColor: String {
    switch status {
    case .open:
      return "blue"
    case .closed:
      return "gray"
    case .resolved:
      return "green"
    }
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: POIQuestion, rhs: POIQuestion) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Answer Model

/// POI answer model for community Q&A
struct POIAnswer: Codable, Identifiable, Hashable {
  let id: String
  let questionId: String
  let userId: String
  let content: String
  let authorName: String?
  let authorAvatarUrl: String?
  let upvotesCount: Int
  let downvotesCount: Int
  let isBestAnswer: Bool
  let isEdited: Bool
  let isDeleted: Bool
  let createdAt: Double
  let updatedAt: Double?

  // Enriched fields from server
  var userVote: VoteType?

  enum CodingKeys: String, CodingKey {
    case id
    case questionId = "question_id"
    case userId = "user_id"
    case content
    case authorName = "author_name"
    case authorAvatarUrl = "author_avatar_url"
    case upvotesCount = "upvotes_count"
    case downvotesCount = "downvotes_count"
    case isBestAnswer = "is_best_answer"
    case isEdited = "is_edited"
    case isDeleted = "is_deleted"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
    case userVote = "user_vote"
  }

  // MARK: - Computed Properties

  var createdDate: Date {
    Date(timeIntervalSince1970: createdAt / 1000)
  }

  var updatedDate: Date? {
    guard let updatedAt else { return nil }
    return Date(timeIntervalSince1970: updatedAt / 1000)
  }

  var timeAgo: String {
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .short
    return formatter.localizedString(for: createdDate, relativeTo: Date())
  }

  var score: Int {
    upvotesCount - downvotesCount
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: POIAnswer, rhs: POIAnswer) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Vote Type

enum VoteType: String, Codable {
  case up
  case down
}

// MARK: - API Response Types

/// Question list response
struct QuestionListResponse: Codable {
  let success: Bool
  let data: [POIQuestion]
  let meta: QAPaginationMeta?
}

/// Single question response
struct QuestionResponse: Codable {
  let success: Bool
  let data: POIQuestion?
}

/// Answer list response
struct AnswerListResponse: Codable {
  let success: Bool
  let data: [POIAnswer]
  let meta: QAPaginationMeta?
}

/// Single answer response
struct AnswerResponse: Codable {
  let success: Bool
  let data: POIAnswer?
}

/// Vote response
struct VoteResponse: Codable {
  let success: Bool
  let data: VoteResult

  struct VoteResult: Codable {
    let action: String // "created", "changed", "removed"
    let voteType: VoteType?
    let upvotesCount: Int
    let downvotesCount: Int

    enum CodingKeys: String, CodingKey {
      case action
      case voteType = "vote_type"
      case upvotesCount = "upvotes_count"
      case downvotesCount = "downvotes_count"
    }
  }
}

/// Question count response
struct QuestionCountResponse: Codable {
  let success: Bool
  let data: QuestionCount

  struct QuestionCount: Codable {
    let count: Int
  }
}

/// Search results response
struct QuestionSearchResponse: Codable {
  let success: Bool
  let data: [POIQuestion]
}

/// Q&A Pagination metadata
struct QAPaginationMeta: Codable {
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

// MARK: - Report Reason

enum QAReportReason: String, CaseIterable, Codable {
  case spam
  case inappropriate
  case misleading
  case offTopic = "off_topic"
  case harassment
  case other

  var displayName: String {
    switch self {
    case .spam:
      return "Spam"
    case .inappropriate:
      return "Inappropriate Content"
    case .misleading:
      return "Misleading Information"
    case .offTopic:
      return "Off Topic"
    case .harassment:
      return "Harassment"
    case .other:
      return "Other"
    }
  }

  var icon: String {
    switch self {
    case .spam:
      return "envelope.badge.fill"
    case .inappropriate:
      return "eye.slash.fill"
    case .misleading:
      return "exclamationmark.triangle.fill"
    case .offTopic:
      return "arrow.uturn.right"
    case .harassment:
      return "exclamationmark.shield.fill"
    case .other:
      return "ellipsis.circle.fill"
    }
  }
}

// MARK: - Sort Options

enum QuestionSortOption: String, CaseIterable {
  case newest
  case oldest
  case mostUpvoted = "most_upvoted"
  case mostActive = "most_active"

  var displayName: String {
    switch self {
    case .newest:
      return "Newest"
    case .oldest:
      return "Oldest"
    case .mostUpvoted:
      return "Most Upvoted"
    case .mostActive:
      return "Most Active"
    }
  }

  var icon: String {
    switch self {
    case .newest:
      return "clock"
    case .oldest:
      return "clock.arrow.circlepath"
    case .mostUpvoted:
      return "arrow.up.circle"
    case .mostActive:
      return "flame"
    }
  }
}

enum AnswerSortOption: String, CaseIterable {
  case newest
  case oldest
  case mostUpvoted = "most_upvoted"

  var displayName: String {
    switch self {
    case .newest:
      return "Newest"
    case .oldest:
      return "Oldest"
    case .mostUpvoted:
      return "Most Upvoted"
    }
  }
}
