import Foundation
import OSLog

/// Store for managing chat sessions and messages with AI assistant
@Observable
@MainActor
final class ChatStore {
  // MARK: - Properties

  private(set) var sessions: [ChatSession] = []
  private(set) var currentSession: ChatSession?
  private(set) var messages: [ChatMessage] = []

  private(set) var isLoadingSessions = false
  // ponytail: write-only outside re-entry guard — private, no external readers.
  private var isLoadingMessages = false
  private(set) var isSending = false
  private(set) var isCreatingSession = false

  var errorMessage: String?

  private let apiClient = NetworkClient.shared
  private let logger = Logger(subsystem: "com.sunpebble.trips", category: "ChatStore")

  // MARK: - Session Operations

  /// Fetch chat sessions for the authenticated user (API resolves userId from JWT).
  func fetchSessions(includeArchived: Bool = false) async {
    guard !isLoadingSessions else { return }
    isLoadingSessions = true
    errorMessage = nil

    do {
      let response: ChatSessionListResponse = try await apiClient.fetch(
        path: "chat/sessions",
        queryItems: [
          URLQueryItem(name: "includeArchived", value: includeArchived ? "true" : "false"),
          URLQueryItem(name: "limit", value: "50"),
        ]
      )

      sessions = response.data
      logger.info("Fetched \(response.data.count) chat sessions")
    } catch {
      logger.error("Failed to fetch sessions: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
    }

    isLoadingSessions = false
  }

  /// Create a new chat session. Body is `{ title?, context? }`; context (when non-empty) is sent
  /// as `{ "text": <string> }` to satisfy the API's record schema.
  func createSession(title: String? = nil, context: String? = nil) async -> ChatSession? {
    guard !isCreatingSession else { return nil }
    isCreatingSession = true
    errorMessage = nil

    do {
      var body: [String: Any] = [:]
      if let title { body["title"] = title }
      if let context, !context.isEmpty { body["context"] = ["text": context] }

      let response: CreateSessionResponse = try await apiClient.post(
        path: "chat/sessions",
        body: body
      )

      if let session = response.data {
        sessions.insert(session, at: 0)
        currentSession = session
        messages = []
        logger.info("Created chat session: \(session.id)")
        isCreatingSession = false
        return session
      }
    } catch {
      logger.error("Failed to create session: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
    }

    isCreatingSession = false
    return nil
  }

  /// Select and load a session
  func selectSession(_ session: ChatSession) async {
    currentSession = session
    messages = []
    await fetchMessages(sessionId: session.id)
  }

  /// Archive a session (DELETE /sessions/:id soft-deletes via is_archived).
  func archiveSession(_ session: ChatSession) async -> Bool {
    do {
      try await apiClient.delete(path: "chat/sessions/\(session.id)")
      removeSessionLocally(session.id)
      logger.info("Archived session: \(session.id)")
      return true
    } catch {
      logger.error("Failed to archive session: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
      return false
    }
  }

  /// Delete a session (same route/semantics as archive on the API).
  func deleteSession(_ session: ChatSession) async -> Bool {
    do {
      try await apiClient.delete(path: "chat/sessions/\(session.id)")
      removeSessionLocally(session.id)
      logger.info("Deleted session: \(session.id)")
      return true
    } catch {
      logger.error("Failed to delete session: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
      return false
    }
  }

  // MARK: - Message Operations

  /// Fetch messages for a session. The API has no cursor, so one shot covers it.
  func fetchMessages(sessionId: Int) async {
    guard !isLoadingMessages else { return }
    isLoadingMessages = true
    errorMessage = nil

    do {
      let response: ChatMessageListResponse = try await apiClient.fetch(
        path: "chat/sessions/\(sessionId)/messages",
        queryItems: [URLQueryItem(name: "limit", value: "50")]
      )

      messages = response.data
      logger.info("Fetched \(response.data.count) messages for session \(sessionId)")
    } catch {
      logger.error("Failed to fetch messages: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
    }

    isLoadingMessages = false
  }

  /// Send a message; the API persists user+assistant rows atomically and returns both.
  func sendMessage(_ content: String) async -> Bool {
    guard let session = currentSession, !isSending else { return false }
    isSending = true
    errorMessage = nil

    do {
      let response: SendMessageResponse = try await apiClient.post(
        path: "chat/sessions/\(session.id)/messages",
        body: ["content": content]
      )

      messages.append(response.data.userMessage)
      messages.append(response.data.assistantMessage)

      logger.info("Sent message and received response for session \(session.id)")
      isSending = false
      return true
    } catch {
      logger.error("Failed to send message: \(error.localizedDescription)")
      errorMessage = error.userFacingMessage
      isSending = false
      return false
    }
  }

  // MARK: - Helper Methods

  private func removeSessionLocally(_ sessionId: Int) {
    if let index = sessions.firstIndex(where: { $0.id == sessionId }) {
      sessions.remove(at: index)
    }
    if currentSession?.id == sessionId {
      currentSession = nil
      messages = []
    }
  }
}
