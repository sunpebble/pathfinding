import Foundation

/// API client for collaboration-related operations
actor CollaborationAPIClient {
  static let shared = CollaborationAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { get async { await network.decoder } }
  private var baseURL: URL { get async { await network.baseURL } }

  private init() {}

  // MARK: - Collaboration APIs

  /// Join a collaborative editing session
  func joinCollaborationSession(
    itineraryId: String,
    displayName: String? = nil,
    avatarUrl: String? = nil
  ) async throws -> JoinSessionResponse {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/join")

    let body = JoinSessionRequest(displayName: displayName, avatarUrl: avatarUrl)
    let data = try await network.postWithRetry(url: url, body: body)
    return try await decoder.decode(JoinSessionResponse.self, from: data)
  }

  /// Leave a collaborative editing session
  func leaveCollaborationSession(itineraryId: String) async throws {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/leave")
    _ = try await network.postWithRetry(url: url, body: EmptyBody())
  }

  /// Send heartbeat to keep session alive
  func sendCollaborationHeartbeat(itineraryId: String) async throws {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/heartbeat")
    _ = try await network.postWithRetry(url: url, body: EmptyBody())
  }

  /// Get all collaborators with their presence status
  func getCollaboratorsWithPresence(itineraryId: String) async throws -> [CollaboratorWithPresence] {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/presence")

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try await decoder.decode(CollaboratorsResponse.self, from: data)
    return result.data
  }

  /// Get only online collaborators
  func getOnlineCollaborators(itineraryId: String) async throws -> [CollaboratorPresence] {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/online")

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try await decoder.decode(PresenceListResponse.self, from: data)
    return result.data
  }

  /// Update cursor position in collaborative session
  func updateCollaborationCursor(
    itineraryId: String,
    dayId: String? = nil,
    itemId: String? = nil,
    cursorPosition: CursorPosition? = nil
  ) async throws {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/cursor")

    let body = UpdateCursorRequest(
      currentDayId: dayId,
      currentItemId: itemId,
      cursorPosition: cursorPosition
    )
    _ = try await network.postWithRetry(url: url, body: body)
  }

  /// Update selection state in collaborative session
  func updateCollaborationSelection(
    itineraryId: String,
    elements: [SelectedElement]?
  ) async throws {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/selection")

    let body = UpdateSelectionRequest(selectedElements: elements)
    _ = try await network.postWithRetry(url: url, body: body)
  }

  /// Record an edit operation for conflict tracking
  func recordCollaborationOperation(
    itineraryId: String,
    operationType: String,
    targetType: String,
    targetId: String,
    changes: [String: AnyCodableValue]? = nil,
    baseVersion: Int? = nil
  ) async throws -> RecordOperationResponse {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/operation")

    let body = RecordOperationRequest(
      operationType: operationType,
      targetType: targetType,
      targetId: targetId,
      changes: changes,
      baseVersion: baseVersion
    )
    let data = try await network.postWithRetry(url: url, body: body)
    return try await decoder.decode(RecordOperationResponse.self, from: data)
  }

  /// Get recent operations for an itinerary
  func getRecentOperations(itineraryId: String, limit: Int = 50) async throws -> [EditOperation] {
    var components = URLComponents(
      url: await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/operations"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "limit", value: String(limit))
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try await decoder.decode(OperationsListResponse.self, from: data)
    return result.data
  }

  /// Get conflicted operations that need resolution
  func getConflictedOperations(itineraryId: String) async throws -> [EditOperation] {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(itineraryId)/collaboration/conflicts")

    let data = try await network.fetchWithRetry(url: url, forceRefresh: true)
    let result = try await decoder.decode(OperationsListResponse.self, from: data)
    return result.data
  }

  /// Resolve a conflicted operation
  func resolveCollaborationConflict(
    operationId: String,
    resolution: String
  ) async throws {
    let url = await baseURL.appendingPathComponent("v1/itineraries/\(operationId)/collaboration/resolve")

    let body = ResolveConflictRequest(operationId: operationId, resolution: resolution)
    _ = try await network.postWithRetry(url: url, body: body)
  }
}

// MARK: - Backward Compatibility Extension

extension APIClient {
  /// Join a collaborative editing session
  func joinCollaborationSession(
    itineraryId: String,
    displayName: String? = nil,
    avatarUrl: String? = nil
  ) async throws -> JoinSessionResponse {
    try await CollaborationAPIClient.shared.joinCollaborationSession(
      itineraryId: itineraryId,
      displayName: displayName,
      avatarUrl: avatarUrl
    )
  }

  /// Leave a collaborative editing session
  func leaveCollaborationSession(itineraryId: String) async throws {
    try await CollaborationAPIClient.shared.leaveCollaborationSession(itineraryId: itineraryId)
  }

  /// Send heartbeat to keep session alive
  func sendCollaborationHeartbeat(itineraryId: String) async throws {
    try await CollaborationAPIClient.shared.sendCollaborationHeartbeat(itineraryId: itineraryId)
  }

  /// Get all collaborators with their presence status
  func getCollaboratorsWithPresence(itineraryId: String) async throws -> [CollaboratorWithPresence] {
    try await CollaborationAPIClient.shared.getCollaboratorsWithPresence(itineraryId: itineraryId)
  }

  /// Get only online collaborators
  func getOnlineCollaborators(itineraryId: String) async throws -> [CollaboratorPresence] {
    try await CollaborationAPIClient.shared.getOnlineCollaborators(itineraryId: itineraryId)
  }

  /// Update cursor position in collaborative session
  func updateCollaborationCursor(
    itineraryId: String,
    dayId: String? = nil,
    itemId: String? = nil,
    cursorPosition: CursorPosition? = nil
  ) async throws {
    try await CollaborationAPIClient.shared.updateCollaborationCursor(
      itineraryId: itineraryId,
      dayId: dayId,
      itemId: itemId,
      cursorPosition: cursorPosition
    )
  }

  /// Update selection state in collaborative session
  func updateCollaborationSelection(
    itineraryId: String,
    elements: [SelectedElement]?
  ) async throws {
    try await CollaborationAPIClient.shared.updateCollaborationSelection(
      itineraryId: itineraryId,
      elements: elements
    )
  }

  /// Record an edit operation for conflict tracking
  func recordCollaborationOperation(
    itineraryId: String,
    operationType: String,
    targetType: String,
    targetId: String,
    changes: [String: AnyCodableValue]? = nil,
    baseVersion: Int? = nil
  ) async throws -> RecordOperationResponse {
    try await CollaborationAPIClient.shared.recordCollaborationOperation(
      itineraryId: itineraryId,
      operationType: operationType,
      targetType: targetType,
      targetId: targetId,
      changes: changes,
      baseVersion: baseVersion
    )
  }

  /// Get recent operations for an itinerary
  func getRecentOperations(itineraryId: String, limit: Int = 50) async throws -> [EditOperation] {
    try await CollaborationAPIClient.shared.getRecentOperations(itineraryId: itineraryId, limit: limit)
  }

  /// Get conflicted operations that need resolution
  func getConflictedOperations(itineraryId: String) async throws -> [EditOperation] {
    try await CollaborationAPIClient.shared.getConflictedOperations(itineraryId: itineraryId)
  }

  /// Resolve a conflicted operation
  func resolveCollaborationConflict(
    operationId: String,
    resolution: String
  ) async throws {
    try await CollaborationAPIClient.shared.resolveCollaborationConflict(
      operationId: operationId,
      resolution: resolution
    )
  }
}
