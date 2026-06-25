import Foundation
import SwiftUI

// MARK: - Collaborator Presence

/// Represents a collaborator's presence in a collaborative editing session
struct CollaboratorPresence: Identifiable, Codable, Hashable {
  var id: String { oderId }
  let oderId: String
  let userId: String
  let itineraryId: String
  let displayName: String?
  let avatarUrl: String?
  let color: String
  let lastActiveAt: Double
  let isOnline: Bool
  let currentDayId: String?
  let currentItemId: String?
  let cursorPosition: CursorPosition?
  let selectedElements: [SelectedElement]?

  enum CodingKeys: String, CodingKey {
    case oderId = "_id"
    case userId
    case itineraryId
    case displayName
    case avatarUrl
    case color
    case lastActiveAt
    case isOnline
    case currentDayId
    case currentItemId
    case cursorPosition
    case selectedElements
  }

  /// SwiftUI Color from hex string
  var swiftUIColor: Color {
    Color(hex: color) ?? .blue
  }

  /// Check if user is actively editing
  var isActivelyEditing: Bool {
    guard isOnline else { return false }
    let thirtySecondsAgo = Date().timeIntervalSince1970 * 1000 - 30000
    return lastActiveAt > thirtySecondsAgo
  }
}

/// Cursor position within an editable field
struct CursorPosition: Codable, Hashable {
  let field: String
  let offset: Int?
}

/// Selected element in the itinerary
struct SelectedElement: Codable, Hashable {
  let type: ElementType
  let id: String

  enum ElementType: String, Codable {
    case day
    case item
    case poi
  }
}

// MARK: - Collaborator with Presence

/// A collaborator with their current presence status
struct CollaboratorWithPresence: Identifiable, Codable {
  var id: String { oderId ?? userId }
  let oderId: String?
  let userId: String
  let role: CollaboratorRole
  let isOnline: Bool
  let presence: CollaboratorPresence?

  private enum CodingKeys: String, CodingKey {
    case oderId = "_id"
    case userId
    case role
    case isOnline
    case presence
  }
}

/// Collaborator role in an itinerary
enum CollaboratorRole: String, Codable {
  case owner
  case editor
  case viewer
}

// MARK: - Edit Operations

/// An edit operation for conflict tracking
struct EditOperation: Identifiable, Codable, Sendable {
  var id: String { oderId }
  let oderId: String
  let itineraryId: String
  let userId: String
  let userDisplayName: String?
  let operationType: OperationType
  let targetType: CollaborationTargetType
  let targetId: String
  let targetName: String?
  let changes: [String: AnyCodableValue]?
  let previousValues: [String: AnyCodableValue]?
  let timestamp: Double
  let version: Int
  let status: OperationStatus
  let conflictResolution: CollaborationConflictResolution?

  enum CodingKeys: String, CodingKey {
    case oderId = "_id"
    case itineraryId
    case userId
    case userDisplayName
    case operationType
    case targetType
    case targetId
    case targetName
    case changes
    case previousValues
    case timestamp
    case version
    case status
    case conflictResolution
  }

  /// Human-readable description of the operation
  var description: String {
    let targetDesc = targetName ?? String(targetId.prefix(8)) + "..."
    switch operationType {
    case .create:
      return "created \(targetType.displayName) \"\(targetDesc)\""
    case .update:
      return "updated \(targetType.displayName) \"\(targetDesc)\""
    case .delete:
      return "deleted \(targetType.displayName) \"\(targetDesc)\""
    case .reorder:
      return "reordered \(targetType.displayName) \"\(targetDesc)\""
    }
  }

  /// Time formatted for display
  var timeAgo: String {
    Date(timeIntervalSince1970: timestamp / 1000).relativeFormatted()
  }
}

enum OperationType: String, Codable, Sendable {
  case create
  case update
  case delete
  case reorder
}

enum CollaborationTargetType: String, Codable, Sendable {
  case itinerary
  case day
  case item

  var displayName: String {
    switch self {
    case .itinerary:
      return "itinerary"
    case .day:
      return "day"
    case .item:
      return "item"
    }
  }
}

enum OperationStatus: String, Codable, Sendable {
  case pending
  case applied
  case conflicted
  case rejected
}

/// Conflict resolution details
struct CollaborationConflictResolution: Codable, Sendable {
  let resolvedBy: String
  let resolvedAt: Double
  let resolution: ResolutionType
}

enum ResolutionType: String, Codable, Sendable {
  case acceptMine = "accept_mine"
  case acceptTheirs = "accept_theirs"
  case merge
}

// MARK: - API Request/Response Types

/// Request to join a collaboration session
struct JoinSessionRequest: Encodable {
  let displayName: String?
  let avatarUrl: String?
}

/// Response from joining a session
struct JoinSessionResponse: Decodable {
  let success: Bool
  let data: JoinSessionData
}

struct JoinSessionData: Decodable {
  let presenceId: String
}

/// Request to update cursor position
struct UpdateCursorRequest: Encodable {
  let currentDayId: String?
  let currentItemId: String?
  let cursorPosition: CursorPosition?
}

/// Request to update selection
struct UpdateSelectionRequest: Encodable {
  let selectedElements: [SelectedElement]?
}

/// Request to record an edit operation
struct RecordOperationRequest: Encodable {
  let operationType: String
  let targetType: String
  let targetId: String
  let changes: [String: AnyCodableValue]?
  let baseVersion: Int?
}

/// Response from recording an operation
struct RecordOperationResponse: Decodable {
  let success: Bool
  let data: RecordOperationData
}

struct RecordOperationData: Decodable {
  let operationId: String
  let hasConflict: Bool
  let version: Int
}

/// Request to resolve a conflict
struct ResolveConflictRequest: Encodable {
  let operationId: String
  let resolution: String
}

// MARK: - Generic API Responses

struct CollaboratorsResponse: Decodable {
  let success: Bool
  let data: [CollaboratorWithPresence]
}

struct OperationsListResponse: Decodable {
  let success: Bool
  let data: [EditOperation]
}

struct CollaborationSuccessResponse: Decodable {
  let success: Bool
  let data: EmptyData?
}

struct EmptyData: Decodable {}

// MARK: - Helper Types

/// A type-erased Codable value for dynamic JSON
struct AnyCodableValue: Codable, Hashable, @unchecked Sendable {
  let value: Any

  init(_ value: Any) {
    self.value = value
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()

    if let intValue = try? container.decode(Int.self) {
      value = intValue
    } else if let doubleValue = try? container.decode(Double.self) {
      value = doubleValue
    } else if let stringValue = try? container.decode(String.self) {
      value = stringValue
    } else if let boolValue = try? container.decode(Bool.self) {
      value = boolValue
    } else if let arrayValue = try? container.decode([AnyCodableValue].self) {
      value = arrayValue.map { $0.value }
    } else if let dictValue = try? container.decode([String: AnyCodableValue].self) {
      value = dictValue.mapValues { $0.value }
    } else {
      value = NSNull()
    }
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()

    if let intValue = value as? Int {
      try container.encode(intValue)
    } else if let doubleValue = value as? Double {
      try container.encode(doubleValue)
    } else if let stringValue = value as? String {
      try container.encode(stringValue)
    } else if let boolValue = value as? Bool {
      try container.encode(boolValue)
    } else if let arrayValue = value as? [Any] {
      try container.encode(arrayValue.map { AnyCodableValue($0) })
    } else if let dictValue = value as? [String: Any] {
      try container.encode(dictValue.mapValues { AnyCodableValue($0) })
    } else {
      try container.encodeNil()
    }
  }

  static func == (lhs: AnyCodableValue, rhs: AnyCodableValue) -> Bool {
    // Simple equality check - could be enhanced
    String(describing: lhs.value) == String(describing: rhs.value)
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(String(describing: value))
  }
}
