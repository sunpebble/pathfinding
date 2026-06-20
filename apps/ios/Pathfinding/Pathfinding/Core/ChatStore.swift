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
  private(set) var isLoadingMessages = false
  private(set) var isSending = false
  private(set) var isCreatingSession = false

  private(set) var messagesCursor: String?
  private(set) var messagesIsDone = false

  var errorMessage: String?

  // Temporary message for streaming UI
  var pendingUserMessage: String?
  var pendingAssistantMessage: String?

  private let apiClient = NetworkClient.shared
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "ChatStore")

  // MARK: - Session Operations

  /// Fetch chat sessions for current user
  func fetchSessions(userId: String, includeArchived: Bool = false, refresh: Bool = false) async {
    if refresh {
      sessions = []
    }

    guard !isLoadingSessions else { return }
    isLoadingSessions = true
    errorMessage = nil

    do {
      let response: ChatSessionListResponse = try await apiClient.fetch(
        path: "chat/sessions",
        queryItems: [
          URLQueryItem(name: "userId", value: userId),
          URLQueryItem(name: "includeArchived", value: includeArchived ? "true" : "false"),
          URLQueryItem(name: "limit", value: "50"),
        ]
      )

      sessions = response.data
      logger.info("Fetched \(response.data.count) chat sessions")
    } catch {
      logger.error("Failed to fetch sessions: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingSessions = false
  }

  /// Create a new chat session
  func createSession(
    userId: String,
    title: String? = nil,
    itineraryId: String? = nil,
    guideId: String? = nil,
    context: String? = nil
  ) async -> ChatSession? {
    guard !isCreatingSession else { return nil }
    isCreatingSession = true
    errorMessage = nil

    do {
      var body: [String: Any] = ["userId": userId]
      if let title { body["title"] = title }
      if let itineraryId { body["itineraryId"] = itineraryId }
      if let guideId { body["guideId"] = guideId }
      if let context { body["context"] = context }

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
      errorMessage = error.localizedDescription
    }

    isCreatingSession = false
    return nil
  }

  /// Select and load a session
  func selectSession(_ session: ChatSession) async {
    currentSession = session
    messages = []
    messagesCursor = nil
    messagesIsDone = false

    await fetchMessages(sessionId: session.id, refresh: true)
  }

  /// Archive a session
  func archiveSession(_ session: ChatSession) async -> Bool {
    do {
      let _: ChatSessionResponse = try await apiClient.patch(
        path: "chat/sessions/\(session.id)",
        body: ["isArchived": true]
      )

      // Update local state
      if let index = sessions.firstIndex(where: { $0.id == session.id }) {
        sessions.remove(at: index)
      }
      if currentSession?.id == session.id {
        currentSession = nil
        messages = []
      }

      logger.info("Archived session: \(session.id)")
      return true
    } catch {
      logger.error("Failed to archive session: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return false
    }
  }

  /// Delete a session
  func deleteSession(_ session: ChatSession) async -> Bool {
    do {
      try await apiClient.delete(
        path: "chat/sessions/\(session.id)"
      )

      // Update local state
      if let index = sessions.firstIndex(where: { $0.id == session.id }) {
        sessions.remove(at: index)
      }
      if currentSession?.id == session.id {
        currentSession = nil
        messages = []
      }

      logger.info("Deleted session: \(session.id)")
      return true
    } catch {
      logger.error("Failed to delete session: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return false
    }
  }

  /// Update session title
  func updateSessionTitle(_ session: ChatSession, title: String) async -> Bool {
    do {
      let _: ChatSessionResponse = try await apiClient.patch(
        path: "chat/sessions/\(session.id)",
        body: ["title": title]
      )

      // Update local state
      if sessions.firstIndex(where: { $0.id == session.id }) != nil {
        // Create updated session (since ChatSession is a struct)
        await fetchSessions(userId: session.userId, refresh: true)
      }

      logger.info("Updated session title: \(session.id)")
      return true
    } catch {
      logger.error("Failed to update session title: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return false
    }
  }

  // MARK: - Message Operations

  /// Fetch messages for current session
  func fetchMessages(sessionId: String, refresh: Bool = false) async {
    if refresh {
      messages = []
      messagesCursor = nil
      messagesIsDone = false
    }

    guard !isLoadingMessages, !messagesIsDone else { return }
    isLoadingMessages = true
    errorMessage = nil

    do {
      var queryItems = [
        URLQueryItem(name: "limit", value: "50")
      ]
      if let cursor = messagesCursor {
        queryItems.append(URLQueryItem(name: "cursor", value: cursor))
      }

      let response: ChatMessageListResponse = try await apiClient.fetch(
        path: "chat/sessions/\(sessionId)/messages",
        queryItems: queryItems
      )

      if refresh {
        messages = response.data
      } else {
        messages.append(contentsOf: response.data)
      }

      messagesCursor = response.cursor
      messagesIsDone = response.isDone

      logger.info("Fetched \(response.data.count) messages for session \(sessionId)")
    } catch {
      logger.error("Failed to fetch messages: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingMessages = false
  }

  /// Load more messages (pagination)
  func loadMoreMessages() async {
    guard let session = currentSession, !messagesIsDone else { return }
    await fetchMessages(sessionId: session.id)
  }

  /// Send a message and get AI response
  func sendMessage(_ content: String) async -> Bool {
    guard let session = currentSession, !isSending else { return false }
    isSending = true
    errorMessage = nil
    pendingUserMessage = content
    pendingAssistantMessage = nil

    do {
      let _: SendMessageResponse = try await apiClient.post(
        path: "chat/sessions/\(session.id)/messages",
        body: ["content": content]
      )

      // Clear pending states
      pendingUserMessage = nil
      pendingAssistantMessage = nil

      // Refresh messages to get the new ones
      await fetchMessages(sessionId: session.id, refresh: true)

      // Update session in list (message count changed)
      if sessions.firstIndex(where: { $0.id == session.id }) != nil {
        // Reload sessions to get updated counts
        await fetchSessions(userId: session.userId)
      }

      logger.info("Sent message and received response")
      isSending = false
      return true
    } catch {
      logger.error("Failed to send message: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      pendingUserMessage = nil
      pendingAssistantMessage = nil
      isSending = false
      return false
    }
  }

  /// Clear all messages in current session
  func clearMessages() async -> Bool {
    guard let session = currentSession else { return false }

    do {
      try await apiClient.delete(
        path: "chat/sessions/\(session.id)/messages"
      )

      messages = []
      messagesCursor = nil
      messagesIsDone = true

      logger.info("Cleared messages for session: \(session.id)")
      return true
    } catch {
      logger.error("Failed to clear messages: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return false
    }
  }

  // MARK: - Quick Chat (Stateless)

  /// Send a quick chat query without session
  func quickChat(
    message: String,
    context: ChatContext? = nil
  ) async -> ChatResponse? {
    do {
      var body: [String: Any] = ["message": message]
      if let context {
        body["context"] = try JSONEncoder().encode(context)
      }

      let response: ChatQueryResponse = try await apiClient.post(
        path: "chat/query",
        body: body
      )

      return response.data
    } catch {
      logger.error("Quick chat failed: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return nil
    }
  }

  // MARK: - Helper Methods

  /// Clear current session state
  func clearCurrentSession() {
    currentSession = nil
    messages = []
    messagesCursor = nil
    messagesIsDone = false
    pendingUserMessage = nil
    pendingAssistantMessage = nil
  }
}
