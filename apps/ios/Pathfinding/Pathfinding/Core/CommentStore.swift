import Foundation
import OSLog

/// Store for managing comments and notifications
@Observable
@MainActor
final class CommentStore {
  // MARK: - Properties

  private(set) var comments: [ItineraryComment] = []
  private(set) var replies: [String: [ItineraryComment]] = [:] // parentId -> replies
  private(set) var notifications: [UserNotification] = []
  private(set) var unreadCount: Int = 0

  private(set) var isLoadingComments = false
  private(set) var isLoadingReplies = false
  private(set) var isLoadingNotifications = false
  private(set) var isSubmitting = false

  private(set) var commentsPage = 1
  private(set) var commentsTotalPages = 1
  private(set) var notificationsPage = 1
  private(set) var notificationsTotalPages = 1

  var errorMessage: String?

  private let apiClient = APIClient.shared
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "CommentStore")

  // MARK: - Comment Operations

  /// Fetch comments for an itinerary
  func fetchComments(itineraryId: String, page: Int = 1, refresh: Bool = false) async {
    if refresh {
      comments = []
      commentsPage = 1
    }

    guard !isLoadingComments else { return }
    isLoadingComments = true
    errorMessage = nil

    do {
      let response: CommentListResponse = try await apiClient.fetch(
        path: "comments",
        queryItems: [
          URLQueryItem(name: "itineraryId", value: itineraryId),
          URLQueryItem(name: "page", value: String(page)),
          URLQueryItem(name: "pageSize", value: "20"),
        ]
      )

      if refresh || page == 1 {
        comments = response.data
      } else {
        comments.append(contentsOf: response.data)
      }

      commentsPage = response.meta?.page ?? page
      commentsTotalPages = response.meta?.totalPages ?? 1

      logger.info("Fetched \(response.data.count) comments for itinerary \(itineraryId)")
    } catch {
      logger.error("Failed to fetch comments: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingComments = false
  }

  /// Fetch replies for a comment
  func fetchReplies(commentId: String) async {
    guard !isLoadingReplies else { return }
    isLoadingReplies = true

    do {
      let response: CommentListResponse = try await apiClient.fetch(
        path: "comments/replies",
        queryItems: [
          URLQueryItem(name: "commentId", value: commentId)
        ]
      )

      replies[commentId] = response.data
      logger.info("Fetched \(response.data.count) replies for comment \(commentId)")
    } catch {
      logger.error("Failed to fetch replies: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingReplies = false
  }

  /// Create a new comment
  func createComment(itineraryId: String, content: String, parentId: String? = nil) async -> Bool {
    print("📝 createComment called - itineraryId: \(itineraryId), content: \(content.prefix(50))...")

    guard !isSubmitting else {
      print("📝 Already submitting, returning false")
      return false
    }
    isSubmitting = true
    errorMessage = nil

    do {
      var body: [String: Any] = [
        "itineraryId": itineraryId,
        "content": content
      ]
      if let parentId {
        body["parentId"] = parentId
      }

      print("📝 Calling API post with body: \(body)")
      let _: CommentResponse = try await apiClient.post(
        path: "comments",
        body: body
      )

      print("📝 Comment created successfully, refreshing comments...")
      // Refresh comments after creating
      await fetchComments(itineraryId: itineraryId, refresh: true)

      // If it's a reply, refresh replies too
      if let parentId {
        await fetchReplies(commentId: parentId)
      }

      logger.info("Created comment for itinerary \(itineraryId)")
      isSubmitting = false
      return true
    } catch {
      print("📝 Failed to create comment: \(error)")
      logger.error("Failed to create comment: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Update a comment
  func updateComment(commentId: String, content: String, itineraryId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      let _: CommentResponse = try await apiClient.patch(
        path: "comments",
        body: ["id": commentId, "content": content]
      )

      // Refresh comments
      await fetchComments(itineraryId: itineraryId, refresh: true)

      logger.info("Updated comment \(commentId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to update comment: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Delete a comment
  func deleteComment(commentId: String, itineraryId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      try await apiClient.delete(path: "comments", body: ["id": commentId])

      // Refresh comments
      await fetchComments(itineraryId: itineraryId, refresh: true)

      logger.info("Deleted comment \(commentId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to delete comment: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Toggle like on a comment
  func toggleLike(commentId: String) async -> Bool {
    do {
      let response: CommentLikeToggleResponse = try await apiClient.post(
        path: "comments/like",
        body: ["commentId": commentId]
      )

      // Update local state
      if let index = comments.firstIndex(where: { $0.id == commentId }) {
        var updated = comments[index]
        updated.isLikedByUser = response.data.liked
        comments[index] = updated
      }

      // Also check replies
      for (parentId, replyList) in replies {
        if let index = replyList.firstIndex(where: { $0.id == commentId }) {
          var updated = replyList[index]
          updated.isLikedByUser = response.data.liked
          replies[parentId]?[index] = updated
        }
      }

      logger.info("Toggled like on comment \(commentId): \(response.data.liked)")
      return response.data.liked
    } catch {
      logger.error("Failed to toggle like: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return false
    }
  }

  /// Report a comment
  func reportComment(commentId: String, reason: CommentReportReason, description: String?) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      var body: [String: Any] = [
        "commentId": commentId,
        "reason": reason.rawValue
      ]
      if let description, !description.isEmpty {
        body["description"] = description
      }

      try await apiClient.postVoid(
        path: "comments/report",
        body: body
      )

      logger.info("Reported comment \(commentId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to report comment: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  // MARK: - Notification Operations

  /// Fetch notifications
  func fetchNotifications(page: Int = 1, unreadOnly: Bool = false, refresh: Bool = false) async {
    if refresh {
      notifications = []
      notificationsPage = 1
    }

    guard !isLoadingNotifications else { return }
    isLoadingNotifications = true
    errorMessage = nil

    do {
      let response: NotificationListResponse = try await apiClient.fetch(
        path: "notifications",
        queryItems: [
          URLQueryItem(name: "page", value: String(page)),
          URLQueryItem(name: "pageSize", value: "20"),
          URLQueryItem(name: "unreadOnly", value: String(unreadOnly)),
        ]
      )

      if refresh || page == 1 {
        notifications = response.data
      } else {
        notifications.append(contentsOf: response.data)
      }

      notificationsPage = response.meta?.page ?? page
      notificationsTotalPages = response.meta?.totalPages ?? 1

      logger.info("Fetched \(response.data.count) notifications")
    } catch {
      logger.error("Failed to fetch notifications: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingNotifications = false
  }

  /// Fetch unread notification count
  func fetchUnreadCount() async {
    do {
      let response: UnreadCountResponse = try await apiClient.fetch(path: "notifications/unread-count")
      unreadCount = response.data.count
      logger.info("Unread notifications: \(self.unreadCount)")
    } catch {
      logger.error("Failed to fetch unread count: \(error.localizedDescription)")
    }
  }

  /// Mark notification as read
  func markNotificationRead(notificationId: String) async {
    do {
      try await apiClient.postVoid(
        path: "notifications/\(notificationId)/read",
        body: [:]
      )

      // Update local state
      if let index = notifications.firstIndex(where: { $0.id == notificationId }) {
        notifications.remove(at: index)
        // Re-insert with updated state would require mutable model
      }

      // Decrement unread count
      if unreadCount > 0 {
        unreadCount -= 1
      }

      logger.info("Marked notification \(notificationId) as read")
    } catch {
      logger.error("Failed to mark notification as read: \(error.localizedDescription)")
    }
  }

  /// Mark all notifications as read
  func markAllNotificationsRead() async {
    do {
      try await apiClient.postVoid(
        path: "notifications/read-all",
        body: [:]
      )

      unreadCount = 0
      await fetchNotifications(refresh: true)

      logger.info("Marked all notifications as read")
    } catch {
      logger.error("Failed to mark all notifications as read: \(error.localizedDescription)")
    }
  }

  // MARK: - Helpers

  /// Clear all data
  func clear() {
    comments = []
    replies = [:]
    notifications = []
    unreadCount = 0
    commentsPage = 1
    notificationsPage = 1
    errorMessage = nil
  }

  /// Load more comments if available
  func loadMoreComments(itineraryId: String) async {
    guard commentsPage < commentsTotalPages else { return }
    await fetchComments(itineraryId: itineraryId, page: commentsPage + 1)
  }

  /// Load more notifications if available
  func loadMoreNotifications() async {
    guard notificationsPage < notificationsTotalPages else { return }
    await fetchNotifications(page: notificationsPage + 1)
  }
}

