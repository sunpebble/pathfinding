import Foundation
import Observation
import OSLog

/// Manager for real-time collaborative editing sessions
@MainActor
@Observable
final class CollaborationManager {
  static let shared = CollaborationManager()

  private let logger = Logger(subsystem: "com.sunpebble.trips", category: "CollaborationManager")
  private let apiClient = CollaborationAPIClient.shared

  // MARK: - State

  /// Current active session itinerary ID
  private(set) var activeItineraryId: String?

  /// Current user's presence ID in the session
  private(set) var presenceId: String?

  /// All collaborators with their presence status
  private(set) var collaborators: [CollaboratorWithPresence] = []

  /// Online collaborators only
  var onlineCollaborators: [CollaboratorPresence] {
    collaborators.compactMap { $0.presence }.filter { $0.isActivelyEditing }
  }

  /// Recent edit operations
  private(set) var recentOperations: [EditOperation] = []

  /// Conflicted operations that need resolution
  private(set) var conflictedOperations: [EditOperation] = []

  /// Whether currently in a collaborative session
  var isInSession: Bool {
    activeItineraryId != nil && presenceId != nil
  }

  /// Loading state
  private(set) var isLoading = false

  /// Error message
  private(set) var errorMessage: String?

  // MARK: - Heartbeat

  private var heartbeatTask: Task<Void, Never>?
  private var pollingTask: Task<Void, Never>?

  private let heartbeatInterval: TimeInterval = 15 // seconds
  private let pollingInterval: TimeInterval = 5 // seconds

  private init() {}

  // MARK: - Session Management

  /// Join a collaborative editing session
  /// - Parameters:
  ///   - itineraryId: The itinerary to collaborate on
  ///   - displayName: Optional display name for the user
  ///   - avatarUrl: Optional avatar URL for the user
  func joinSession(
    itineraryId: String,
    displayName: String? = nil,
    avatarUrl: String? = nil
  ) async throws {
    if isInSession {
      logger.warning("Already in a session, leaving current session first")
      await leaveSession()
    }

    isLoading = true
    errorMessage = nil

    do {
      let response = try await apiClient.joinCollaborationSession(
        itineraryId: itineraryId,
        displayName: displayName,
        avatarUrl: avatarUrl
      )

      activeItineraryId = itineraryId
      presenceId = response.data.presenceId

      logger.info("Joined collaboration session for itinerary \(itineraryId)")

      // Start heartbeat and polling
      startHeartbeat()
      startPolling()

      // Initial fetch of collaborators
      await refreshCollaborators()

      isLoading = false
    } catch {
      isLoading = false
      errorMessage = error.localizedDescription
      logger.error("Failed to join session: \(error.localizedDescription)")
      throw error
    }
  }

  /// Leave the current collaborative session
  func leaveSession() async {
    guard let itineraryId = activeItineraryId else { return }

    // Stop background tasks
    stopHeartbeat()
    stopPolling()

    do {
      try await apiClient.leaveCollaborationSession(itineraryId: itineraryId)
      logger.info("Left collaboration session for itinerary \(itineraryId)")
    } catch {
      logger.error("Failed to leave session cleanly: \(error.localizedDescription)")
    }

    // Clear state
    activeItineraryId = nil
    presenceId = nil
    collaborators = []
    recentOperations = []
    conflictedOperations = []
  }

  // MARK: - Presence Updates

  /// Update cursor position in the collaborative session
  /// - Parameters:
  ///   - dayId: Current day being edited
  ///   - itemId: Current item being edited
  ///   - field: Field name being edited
  ///   - offset: Cursor offset within the field
  func updateCursor(
    dayId: String? = nil,
    itemId: String? = nil,
    field: String? = nil,
    offset: Int? = nil
  ) async {
    guard let itineraryId = activeItineraryId else { return }

    let cursorPosition: CursorPosition? = field.map { CursorPosition(field: $0, offset: offset) }

    do {
      try await apiClient.updateCollaborationCursor(
        itineraryId: itineraryId,
        dayId: dayId,
        itemId: itemId,
        cursorPosition: cursorPosition
      )
    } catch {
      logger.error("Failed to update cursor: \(error.localizedDescription)")
    }
  }

  /// Update selection state in the collaborative session
  /// - Parameter elements: Currently selected elements
  func updateSelection(elements: [SelectedElement]?) async {
    guard let itineraryId = activeItineraryId else { return }

    do {
      try await apiClient.updateCollaborationSelection(
        itineraryId: itineraryId,
        elements: elements
      )
    } catch {
      logger.error("Failed to update selection: \(error.localizedDescription)")
    }
  }

  // MARK: - Edit Operations

  /// Record an edit operation for conflict tracking
  /// - Parameters:
  ///   - operationType: Type of operation (create, update, delete, reorder)
  ///   - targetType: Type of target (itinerary, day, item)
  ///   - targetId: ID of the target being edited
  ///   - changes: The changes being made
  ///   - baseVersion: The version this edit is based on
  /// - Returns: The operation result including conflict status
  @discardableResult
  func recordOperation(
    operationType: OperationType,
    targetType: CollaborationTargetType,
    targetId: String,
    changes: [String: Any]? = nil,
    baseVersion: Int? = nil
  ) async throws -> RecordOperationData {
    guard let itineraryId = activeItineraryId else {
      throw CollaborationError.notInSession
    }

    let response = try await apiClient.recordCollaborationOperation(
      itineraryId: itineraryId,
      operationType: operationType.rawValue,
      targetType: targetType.rawValue,
      targetId: targetId,
      changes: changes?.mapValues { AnyCodableValue($0) },
      baseVersion: baseVersion
    )

    if response.data.hasConflict {
      logger.warning("Conflict detected for operation on \(targetType.rawValue) \(targetId)")
      // Refresh conflicts
      await refreshConflicts()
    }

    return response.data
  }

  /// Resolve a conflicted operation
  /// - Parameters:
  ///   - operationId: The conflicted operation ID
  ///   - resolution: How to resolve the conflict
  func resolveConflict(
    operationId: String,
    resolution: ResolutionType
  ) async throws {
    guard activeItineraryId != nil else {
      throw CollaborationError.notInSession
    }

    try await apiClient.resolveCollaborationConflict(
      operationId: operationId,
      resolution: resolution.rawValue
    )

    logger.info("Resolved conflict for operation \(operationId) with \(resolution.rawValue)")

    // Refresh conflicts list
    await refreshConflicts()
  }

  // MARK: - Data Refresh

  /// Refresh the list of collaborators
  func refreshCollaborators() async {
    guard let itineraryId = activeItineraryId else { return }

    do {
      collaborators = try await apiClient.getCollaboratorsWithPresence(itineraryId: itineraryId)
    } catch {
      logger.error("Failed to refresh collaborators: \(error.localizedDescription)")
    }
  }

  /// Refresh recent operations
  func refreshOperations(limit: Int = 50) async {
    guard let itineraryId = activeItineraryId else { return }

    do {
      recentOperations = try await apiClient.getRecentOperations(
        itineraryId: itineraryId,
        limit: limit
      )
    } catch {
      logger.error("Failed to refresh operations: \(error.localizedDescription)")
    }
  }

  /// Refresh conflicted operations
  func refreshConflicts() async {
    guard let itineraryId = activeItineraryId else { return }

    do {
      conflictedOperations = try await apiClient.getConflictedOperations(itineraryId: itineraryId)
    } catch {
      logger.error("Failed to refresh conflicts: \(error.localizedDescription)")
    }
  }

  // MARK: - Background Tasks

  private func startHeartbeat() {
    stopHeartbeat()

    heartbeatTask = Task { [weak self] in
      while !Task.isCancelled {
        guard let self = self, let itineraryId = self.activeItineraryId else { break }

        do {
          try await self.apiClient.sendCollaborationHeartbeat(itineraryId: itineraryId)
          self.logger.debug("Heartbeat sent for itinerary \(itineraryId)")
        } catch {
          self.logger.error("Heartbeat failed: \(error.localizedDescription)")
        }

        try? await Task.sleep(for: .seconds(self.heartbeatInterval))
      }
    }
  }

  private func stopHeartbeat() {
    heartbeatTask?.cancel()
    heartbeatTask = nil
  }

  private func startPolling() {
    stopPolling()

    pollingTask = Task { [weak self] in
      while !Task.isCancelled {
        guard let self = self, self.activeItineraryId != nil else { break }

        // Refresh collaborators and conflicts periodically
        await self.refreshCollaborators()
        await self.refreshConflicts()

        try? await Task.sleep(for: .seconds(self.pollingInterval))
      }
    }
  }

  private func stopPolling() {
    pollingTask?.cancel()
    pollingTask = nil
  }

  // MARK: - Cleanup

  /// Clean up when app goes to background
  func handleAppBackground() async {
    await leaveSession()
  }

  /// Rejoin session when app comes to foreground
  func handleAppForeground(itineraryId: String) async {
    if activeItineraryId == nil {
      try? await joinSession(itineraryId: itineraryId)
    }
  }
}

// MARK: - Errors

enum CollaborationError: LocalizedError {
  case notInSession
  case sessionExpired
  case conflictDetected
  case networkError(Error)

  var errorDescription: String? {
    switch self {
    case .notInSession:
      return "Not in a collaborative session"
    case .sessionExpired:
      return "Collaboration session has expired"
    case .conflictDetected:
      return "Edit conflict detected"
    case .networkError(let error):
      return "Network error: \(error.localizedDescription)"
    }
  }
}
