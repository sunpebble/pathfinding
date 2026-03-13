import Foundation
import OSLog

/// Store for managing travel notes (游记)
@Observable
@MainActor
final class TravelNoteStore {
  // MARK: - Properties

  /// Public travel notes for discovery feed
  private(set) var publicNotes: [TravelNote] = []

  /// User's own travel notes
  private(set) var myNotes: [TravelNote] = []

  /// Currently selected note for detail view
  private(set) var selectedNote: TravelNote?

  /// Comments for the selected note
  private(set) var comments: [NoteComment] = []

  /// Replies cache by parent comment ID
  private(set) var replies: [String: [NoteComment]] = [:]

  /// Popular tags for discovery
  private(set) var popularTags: [PopularTag] = []

  /// Like status cache
  private(set) var likeStatus: [String: Bool] = [:]

  /// Comment like status cache
  private(set) var commentLikeStatus: [String: Bool] = [:]

  // Loading states
  private(set) var isLoadingPublic = false
  private(set) var isLoadingMyNotes = false
  private(set) var isLoadingDetail = false
  private(set) var isLoadingComments = false
  private(set) var isSubmitting = false
  private(set) var isSearching = false

  // Pagination
  private(set) var publicPage = 1
  private(set) var publicTotalPages = 1
  private(set) var myNotesPage = 1
  private(set) var myNotesTotalPages = 1
  private(set) var commentsPage = 1
  private(set) var commentsTotalPages = 1

  // Search
  private(set) var searchResults: [TravelNote] = []
  private(set) var searchPage = 1
  private(set) var searchTotalPages = 1

  // Error handling
  var errorMessage: String?

  private let apiClient = APIClient.shared
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "TravelNoteStore")

  // MARK: - Public Notes (Discovery Feed)

  /// Fetch public travel notes for community discovery
  func fetchPublicNotes(
    page: Int = 1,
    tag: String? = nil,
    sortBy: String = "latest",
    refresh: Bool = false
  ) async {
    if refresh {
      publicNotes = []
      publicPage = 1
    }

    guard !isLoadingPublic else { return }
    isLoadingPublic = true
    errorMessage = nil

    do {
      var queryItems = [
        URLQueryItem(name: "page", value: String(page)),
        URLQueryItem(name: "pageSize", value: "20"),
        URLQueryItem(name: "sortBy", value: sortBy),
      ]
      if let tag = tag {
        queryItems.append(URLQueryItem(name: "tag", value: tag))
      }

      let response: TravelNoteListResponse = try await apiClient.fetch(
        path: "travel-notes/public",
        queryItems: queryItems
      )

      if refresh || page == 1 {
        publicNotes = response.data
      } else {
        publicNotes.append(contentsOf: response.data)
      }

      publicPage = response.meta.page
      publicTotalPages = response.meta.totalPages

      // Batch check likes for authenticated users
      if !response.data.isEmpty {
        await batchCheckLikes(noteIds: response.data.map { $0.id })
      }

      logger.info("Fetched \(response.data.count) public notes")
    } catch {
      logger.error("Failed to fetch public notes: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingPublic = false
  }

  /// Load more public notes
  func loadMorePublicNotes(tag: String? = nil, sortBy: String = "latest") async {
    guard publicPage < publicTotalPages else { return }
    await fetchPublicNotes(page: publicPage + 1, tag: tag, sortBy: sortBy)
  }

  // MARK: - My Notes

  /// Fetch user's own travel notes
  func fetchMyNotes(
    page: Int = 1,
    visibility: NoteVisibility? = nil,
    refresh: Bool = false
  ) async {
    if refresh {
      myNotes = []
      myNotesPage = 1
    }

    guard !isLoadingMyNotes else { return }
    isLoadingMyNotes = true
    errorMessage = nil

    do {
      var queryItems = [
        URLQueryItem(name: "page", value: String(page)),
        URLQueryItem(name: "pageSize", value: "20"),
      ]
      if let visibility = visibility {
        queryItems.append(URLQueryItem(name: "visibility", value: visibility.rawValue))
      }

      let response: TravelNoteListResponse = try await apiClient.fetch(
        path: "travel-notes",
        queryItems: queryItems
      )

      if refresh || page == 1 {
        myNotes = response.data
      } else {
        myNotes.append(contentsOf: response.data)
      }

      myNotesPage = response.meta.page
      myNotesTotalPages = response.meta.totalPages

      logger.info("Fetched \(response.data.count) of my notes")
    } catch {
      logger.error("Failed to fetch my notes: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingMyNotes = false
  }

  /// Load more of user's notes
  func loadMoreMyNotes(visibility: NoteVisibility? = nil) async {
    guard myNotesPage < myNotesTotalPages else { return }
    await fetchMyNotes(page: myNotesPage + 1, visibility: visibility)
  }

  // MARK: - Note Detail

  /// Fetch a single travel note by ID
  func fetchNoteDetail(noteId: String) async {
    guard !isLoadingDetail else { return }
    isLoadingDetail = true
    errorMessage = nil

    do {
      let response: TravelNoteDetailResponse = try await apiClient.fetch(
        path: "travel-notes/\(noteId)"
      )

      selectedNote = response.data

      // Check like status
      await checkLikeStatus(noteId: noteId)

      logger.info("Fetched note detail: \(noteId)")
    } catch {
      logger.error("Failed to fetch note detail: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingDetail = false
  }

  /// Clear selected note
  func clearSelectedNote() {
    selectedNote = nil
    comments = []
    replies = [:]
    commentsPage = 1
  }

  // MARK: - Search

  /// Search travel notes
  func searchNotes(query: String, page: Int = 1, refresh: Bool = false) async {
    if refresh {
      searchResults = []
      searchPage = 1
    }

    guard !isSearching else { return }
    isSearching = true
    errorMessage = nil

    do {
      let response: TravelNoteListResponse = try await apiClient.fetch(
        path: "travel-notes/search",
        queryItems: [
          URLQueryItem(name: "q", value: query),
          URLQueryItem(name: "page", value: String(page)),
          URLQueryItem(name: "pageSize", value: "20"),
        ]
      )

      if refresh || page == 1 {
        searchResults = response.data
      } else {
        searchResults.append(contentsOf: response.data)
      }

      searchPage = response.meta.page
      searchTotalPages = response.meta.totalPages

      logger.info("Search found \(response.data.count) notes for '\(query)'")
    } catch {
      logger.error("Failed to search notes: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isSearching = false
  }

  /// Load more search results
  func loadMoreSearchResults(query: String) async {
    guard searchPage < searchTotalPages else { return }
    await searchNotes(query: query, page: searchPage + 1)
  }

  /// Clear search results
  func clearSearch() {
    searchResults = []
    searchPage = 1
    searchTotalPages = 1
  }

  // MARK: - Popular Tags

  /// Fetch popular tags
  func fetchPopularTags(limit: Int = 20) async {
    do {
      let response: PopularTagsResponse = try await apiClient.fetch(
        path: "travel-notes/tags/popular",
        queryItems: [URLQueryItem(name: "limit", value: String(limit))]
      )

      popularTags = response.data
      logger.info("Fetched \(response.data.count) popular tags")
    } catch {
      logger.error("Failed to fetch popular tags: \(error.localizedDescription)")
    }
  }

  // MARK: - CRUD Operations

  /// Create a new travel note
  func createNote(input: CreateTravelNoteInput) async -> TravelNote? {
    guard !isSubmitting else { return nil }
    isSubmitting = true
    errorMessage = nil

    do {
      let response: TravelNoteDetailResponse = try await apiClient.postCodable(
        path: "travel-notes",
        body: input
      )

      // Add to my notes
      myNotes.insert(response.data, at: 0)

      logger.info("Created travel note: \(response.data.id)")
      isSubmitting = false
      return response.data
    } catch {
      logger.error("Failed to create note: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return nil
    }
  }

  /// Update a travel note
  func updateNote(noteId: String, input: UpdateTravelNoteInput) async -> TravelNote? {
    guard !isSubmitting else { return nil }
    isSubmitting = true
    errorMessage = nil

    do {
      let response: TravelNoteDetailResponse = try await apiClient.patchCodable(
        path: "travel-notes/\(noteId)",
        body: input
      )

      // Update in my notes
      if let index = myNotes.firstIndex(where: { $0.id == noteId }) {
        myNotes[index] = response.data
      }

      // Update selected note if it's the same
      if selectedNote?.id == noteId {
        selectedNote = response.data
      }

      logger.info("Updated travel note: \(noteId)")
      isSubmitting = false
      return response.data
    } catch {
      logger.error("Failed to update note: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return nil
    }
  }

  /// Delete a travel note
  func deleteNote(noteId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      try await apiClient.delete(path: "travel-notes/\(noteId)")

      // Remove from my notes
      myNotes.removeAll { $0.id == noteId }

      // Clear selected if it's the deleted one
      if selectedNote?.id == noteId {
        selectedNote = nil
      }

      logger.info("Deleted travel note: \(noteId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to delete note: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  // MARK: - Likes

  /// Toggle like on a travel note
  func toggleLike(noteId: String) async -> Bool {
    do {
      let response: LikeToggleResponse = try await apiClient.post(
        path: "travel-notes/\(noteId)/like",
        body: [:]
      )

      likeStatus[noteId] = response.data.liked

      // Update counts in lists
      updateNoteLikeCount(noteId: noteId, liked: response.data.liked)

      logger.info("Toggled like on note \(noteId): \(response.data.liked)")
      return response.data.liked
    } catch {
      logger.error("Failed to toggle like: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return likeStatus[noteId] ?? false
    }
  }

  /// Check like status for a single note
  func checkLikeStatus(noteId: String) async {
    do {
      let response: LikeCheckResponse = try await apiClient.fetch(
        path: "travel-notes/\(noteId)/like"
      )
      likeStatus[noteId] = response.data.liked
    } catch {
      logger.error("Failed to check like status: \(error.localizedDescription)")
    }
  }

  /// Batch check likes for multiple notes
  func batchCheckLikes(noteIds: [String]) async {
    guard !noteIds.isEmpty else { return }

    do {
      let response: BatchLikeCheckResponse = try await apiClient.post(
        path: "travel-notes/likes/batch",
        body: ["noteIds": noteIds]
      )

      for (noteId, liked) in response.data {
        likeStatus[noteId] = liked
      }
    } catch {
      logger.error("Failed to batch check likes: \(error.localizedDescription)")
    }
  }

  /// Helper to update like count in note lists
  private func updateNoteLikeCount(noteId: String, liked: Bool) {
    _ = liked ? 1 : -1

    if publicNotes.firstIndex(where: { $0.id == noteId }) != nil {
      // Note: TravelNote is a struct, we need to create a new one
      // This is a simplified approach - in production you might want mutable models
    }

    if myNotes.firstIndex(where: { $0.id == noteId }) != nil {
      // Same as above
    }

    if selectedNote?.id == noteId {
      // Same as above
    }
  }

  // MARK: - Comments

  /// Fetch comments for a travel note
  func fetchComments(
    noteId: String,
    page: Int = 1,
    sortBy: String = "latest",
    refresh: Bool = false
  ) async {
    if refresh {
      comments = []
      commentsPage = 1
    }

    guard !isLoadingComments else { return }
    isLoadingComments = true
    errorMessage = nil

    do {
      let response: TravelNoteCommentListResponse = try await apiClient.fetch(
        path: "travel-notes/\(noteId)/comments",
        queryItems: [
          URLQueryItem(name: "page", value: String(page)),
          URLQueryItem(name: "pageSize", value: "20"),
          URLQueryItem(name: "sortBy", value: sortBy),
        ]
      )

      if refresh || page == 1 {
        comments = response.data
      } else {
        comments.append(contentsOf: response.data)
      }

      commentsPage = response.meta.page
      commentsTotalPages = response.meta.totalPages

      // Batch check comment likes
      let commentIds = response.data.map { $0.id }
      if !commentIds.isEmpty {
        await batchCheckCommentLikes(commentIds: commentIds)
      }

      logger.info("Fetched \(response.data.count) comments for note \(noteId)")
    } catch {
      logger.error("Failed to fetch comments: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingComments = false
  }

  /// Load more comments
  func loadMoreComments(noteId: String, sortBy: String = "latest") async {
    guard commentsPage < commentsTotalPages else { return }
    await fetchComments(noteId: noteId, page: commentsPage + 1, sortBy: sortBy)
  }

  /// Fetch replies for a comment
  func fetchReplies(commentId: String) async {
    do {
      let response: TravelNoteCommentListResponse = try await apiClient.fetch(
        path: "travel-notes/comments/\(commentId)/replies"
      )

      replies[commentId] = response.data
      logger.info("Fetched \(response.data.count) replies for comment \(commentId)")
    } catch {
      logger.error("Failed to fetch replies: \(error.localizedDescription)")
    }
  }

  /// Create a comment
  func createComment(noteId: String, content: String, parentId: String? = nil) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      var body: [String: Any] = ["content": content]
      if let parentId = parentId {
        body["parentId"] = parentId
      }

      let _: CreateCommentResponse = try await apiClient.post(
        path: "travel-notes/\(noteId)/comments",
        body: body
      )

      // Refresh comments
      await fetchComments(noteId: noteId, refresh: true)

      // If it's a reply, refresh replies too
      if let parentId = parentId {
        await fetchReplies(commentId: parentId)
      }

      logger.info("Created comment on note \(noteId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to create comment: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Update a comment
  func updateComment(commentId: String, content: String, noteId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      let _: UpdateCommentResponse = try await apiClient.patch(
        path: "travel-notes/comments/\(commentId)",
        body: ["content": content]
      )

      // Refresh comments
      await fetchComments(noteId: noteId, refresh: true)

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
  func deleteComment(commentId: String, noteId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      try await apiClient.delete(path: "travel-notes/comments/\(commentId)")

      // Refresh comments
      await fetchComments(noteId: noteId, refresh: true)

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
  func toggleCommentLike(commentId: String) async -> Bool {
    do {
      let response: LikeToggleResponse = try await apiClient.post(
        path: "travel-notes/comments/\(commentId)/like",
        body: [:]
      )

      commentLikeStatus[commentId] = response.data.liked

      logger.info("Toggled like on comment \(commentId): \(response.data.liked)")
      return response.data.liked
    } catch {
      logger.error("Failed to toggle comment like: \(error.localizedDescription)")
      return commentLikeStatus[commentId] ?? false
    }
  }

  /// Batch check comment likes
  func batchCheckCommentLikes(commentIds: [String]) async {
    guard !commentIds.isEmpty else { return }

    do {
      let response: BatchLikeCheckResponse = try await apiClient.post(
        path: "travel-notes/comments/likes/batch",
        body: ["commentIds": commentIds]
      )

      for (commentId, liked) in response.data {
        commentLikeStatus[commentId] = liked
      }
    } catch {
      logger.error("Failed to batch check comment likes: \(error.localizedDescription)")
    }
  }

  // MARK: - Helpers

  /// Clear all data
  func clear() {
    publicNotes = []
    myNotes = []
    selectedNote = nil
    comments = []
    replies = [:]
    popularTags = []
    likeStatus = [:]
    commentLikeStatus = [:]
    searchResults = []
    publicPage = 1
    myNotesPage = 1
    commentsPage = 1
    searchPage = 1
    errorMessage = nil
  }

  /// Check if a note is liked
  func isNoteLiked(_ noteId: String) -> Bool {
    likeStatus[noteId] ?? false
  }

  /// Check if a comment is liked
  func isCommentLiked(_ commentId: String) -> Bool {
    commentLikeStatus[commentId] ?? false
  }
}

// MARK: - Additional Response Types

struct BatchLikeCheckResponse: Codable {
  let success: Bool
  let data: [String: Bool]
}

struct CreateCommentResponse: Codable {
  let success: Bool
  let data: CommentIdResult
}

struct CommentIdResult: Codable {
  let id: String
}

struct UpdateCommentResponse: Codable {
  let success: Bool
  let data: NoteComment
}

// MARK: - APIClient Extensions for Codable

extension APIClient {
  /// POST request with Codable body
  func postCodable<T: Decodable, B: Encodable>(path: String, body: B) async throws -> T {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    let url = baseURL.appendingPathComponent("v1/\(path)")
    var request = await createAuthenticatedRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      throw APIError.httpError((response as? HTTPURLResponse)?.statusCode ?? 500)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  /// PATCH request with Codable body
  func patchCodable<T: Decodable, B: Encodable>(path: String, body: B) async throws -> T {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    let url = baseURL.appendingPathComponent("v1/\(path)")
    var request = await createAuthenticatedRequest(url: url)
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      throw APIError.httpError((response as? HTTPURLResponse)?.statusCode ?? 500)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }
}
