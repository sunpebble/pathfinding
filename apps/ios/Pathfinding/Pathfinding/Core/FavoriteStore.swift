import Foundation
import OSLog

/// Store for managing itinerary likes and favorites
@Observable
@MainActor
final class FavoriteStore {
  // MARK: - Singleton

  static let shared = FavoriteStore()

  // MARK: - Properties

  // Likes state
  private(set) var likedItineraries: [ItineraryLike] = []
  private(set) var likedIds: Set<String> = [] // Quick lookup for liked status
  private(set) var likeCounts: [String: Int] = [:] // itineraryId -> count

  // Favorites state
  private(set) var favoritedItineraries: [ItineraryFavorite] = []
  private(set) var favoritedIds: Set<String> = [] // Quick lookup for favorited status
  private(set) var favoriteCounts: [String: Int] = [:] // itineraryId -> count

  // Collections state
  private(set) var collections: [FavoriteCollection] = []
  private(set) var selectedCollection: FavoriteCollectionWithItems?

  // Loading states
  private(set) var isLoadingLikes = false
  private(set) var isLoadingFavorites = false
  private(set) var isLoadingCollections = false
  private(set) var isTogglingLike = false
  private(set) var isTogglingFavorite = false
  private(set) var isSubmitting = false

  // Pagination
  private(set) var likesPage = 1
  private(set) var likesTotalPages = 1
  private(set) var favoritesPage = 1
  private(set) var favoritesTotalPages = 1

  // Total counts (from API response)
  private(set) var totalLikesCount = 0
  private(set) var totalFavoritesCount = 0

  var errorMessage: String?

  private let apiClient = APIClient.shared
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "FavoriteStore")

  private init() {}

  // MARK: - Like Operations

  /// Check if an itinerary is liked
  func isLiked(_ itineraryId: String) -> Bool {
    likedIds.contains(itineraryId)
  }

  /// Toggle like on an itinerary
  @discardableResult
  func toggleLike(itineraryId: String) async -> Bool {
    guard !isTogglingLike else { return isLiked(itineraryId) }
    isTogglingLike = true
    errorMessage = nil

    // Optimistic update
    let wasLiked = likedIds.contains(itineraryId)
    if wasLiked {
      likedIds.remove(itineraryId)
      if let count = likeCounts[itineraryId], count > 0 {
        likeCounts[itineraryId] = count - 1
      }
    } else {
      likedIds.insert(itineraryId)
      likeCounts[itineraryId] = (likeCounts[itineraryId] ?? 0) + 1
    }

    do {
      let response: ItineraryLikeToggleResponse = try await apiClient.post(
        path: "itineraries/\(itineraryId)/like",
        body: [:]
      )

      // Update with actual server response
      if response.data.liked {
        likedIds.insert(itineraryId)
      } else {
        likedIds.remove(itineraryId)
      }
      likeCounts[itineraryId] = response.data.likesCount

      logger.info("Toggled like on itinerary \(itineraryId): \(response.data.liked)")
      isTogglingLike = false
      return response.data.liked
    } catch {
      // Rollback optimistic update
      if wasLiked {
        likedIds.insert(itineraryId)
        likeCounts[itineraryId] = (likeCounts[itineraryId] ?? 0) + 1
      } else {
        likedIds.remove(itineraryId)
        if let count = likeCounts[itineraryId], count > 0 {
          likeCounts[itineraryId] = count - 1
        }
      }

      logger.error("Failed to toggle like: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isTogglingLike = false
      return wasLiked
    }
  }

  /// Fetch user's liked itineraries
  func fetchLikedItineraries(page: Int = 1, refresh: Bool = false) async {
    if refresh {
      likedItineraries = []
      likesPage = 1
    }

    guard !isLoadingLikes else { return }
    isLoadingLikes = true
    errorMessage = nil

    do {
      let response: ItineraryLikesListResponse = try await apiClient.fetch(
        path: "me/likes",
        queryItems: [
          URLQueryItem(name: "page", value: String(page)),
          URLQueryItem(name: "pageSize", value: "20"),
        ]
      )

      if refresh || page == 1 {
        likedItineraries = response.data
        // Update liked IDs
        likedIds = Set(response.data.map(\.itineraryId))
      } else {
        likedItineraries.append(contentsOf: response.data)
        response.data.forEach { likedIds.insert($0.itineraryId) }
      }

      likesPage = response.meta?.page ?? page
      likesTotalPages = (response.meta?.total ?? 0) / (response.meta?.limit ?? 20) + 1
      totalLikesCount = response.meta?.total ?? likedItineraries.count

      logger.info("Fetched \(response.data.count) liked itineraries")
    } catch {
      logger.error("Failed to fetch liked itineraries: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingLikes = false
  }

  /// Batch check like status for multiple itineraries
  func batchCheckLikes(itineraryIds: [String]) async {
    guard !itineraryIds.isEmpty else { return }

    do {
      let response: BatchLikesCheckResponse = try await apiClient.post(
        path: "me/likes/batch-check",
        body: ["itineraryIds": itineraryIds]
      )

      for (id, isLiked) in response.data {
        if isLiked {
          likedIds.insert(id)
        } else {
          likedIds.remove(id)
        }
      }

      logger.info("Batch checked \(itineraryIds.count) itinerary likes")
    } catch {
      logger.error("Failed to batch check likes: \(error.localizedDescription)")
    }
  }

  /// Get like count for an itinerary
  func getLikeCount(itineraryId: String) async -> Int {
    if let cached = likeCounts[itineraryId] {
      return cached
    }

    do {
      let response: ItineraryLikeCountResponse = try await apiClient.fetch(
        path: "itineraries/\(itineraryId)/likes/count"
      )
      likeCounts[itineraryId] = response.data.count
      return response.data.count
    } catch {
      logger.error("Failed to get like count: \(error.localizedDescription)")
      return 0
    }
  }

  // MARK: - Favorite Operations

  /// Check if an itinerary is favorited
  func isFavorited(_ itineraryId: String) -> Bool {
    favoritedIds.contains(itineraryId)
  }

  /// Toggle favorite on an itinerary
  @discardableResult
  func toggleFavorite(itineraryId: String) async -> Bool {
    guard !isTogglingFavorite else { return isFavorited(itineraryId) }
    isTogglingFavorite = true
    errorMessage = nil

    // Optimistic update
    let wasFavorited = favoritedIds.contains(itineraryId)
    if wasFavorited {
      favoritedIds.remove(itineraryId)
      if let count = favoriteCounts[itineraryId], count > 0 {
        favoriteCounts[itineraryId] = count - 1
      }
    } else {
      favoritedIds.insert(itineraryId)
      favoriteCounts[itineraryId] = (favoriteCounts[itineraryId] ?? 0) + 1
    }

    do {
      let response: FavoriteToggleResponse = try await apiClient.post(
        path: "itineraries/\(itineraryId)/favorite/toggle",
        body: [:]
      )

      // Update with actual server response
      if response.data.favorited {
        favoritedIds.insert(itineraryId)
      } else {
        favoritedIds.remove(itineraryId)
      }
      favoriteCounts[itineraryId] = response.data.favoritesCount

      logger.info("Toggled favorite on itinerary \(itineraryId): \(response.data.favorited)")
      isTogglingFavorite = false
      return response.data.favorited
    } catch {
      // Rollback optimistic update
      if wasFavorited {
        favoritedIds.insert(itineraryId)
        favoriteCounts[itineraryId] = (favoriteCounts[itineraryId] ?? 0) + 1
      } else {
        favoritedIds.remove(itineraryId)
        if let count = favoriteCounts[itineraryId], count > 0 {
          favoriteCounts[itineraryId] = count - 1
        }
      }

      logger.error("Failed to toggle favorite: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isTogglingFavorite = false
      return wasFavorited
    }
  }

  /// Add itinerary to favorites with optional collection
  func addToFavorites(itineraryId: String, collectionId: String? = nil, notes: String? = nil) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      var body: [String: Any] = [:]
      if let collectionId {
        body["collectionId"] = collectionId
      }
      if let notes, !notes.isEmpty {
        body["notes"] = notes
      }

      let _: FavoriteAddResponse = try await apiClient.post(
        path: "itineraries/\(itineraryId)/favorite",
        body: body
      )

      favoritedIds.insert(itineraryId)
      favoriteCounts[itineraryId] = (favoriteCounts[itineraryId] ?? 0) + 1

      logger.info("Added itinerary \(itineraryId) to favorites")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to add to favorites: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Remove itinerary from favorites
  func removeFromFavorites(itineraryId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      try await apiClient.delete(path: "itineraries/\(itineraryId)/favorite")

      favoritedIds.remove(itineraryId)
      if let count = favoriteCounts[itineraryId], count > 0 {
        favoriteCounts[itineraryId] = count - 1
      }

      // Remove from local list
      favoritedItineraries.removeAll { $0.itineraryId == itineraryId }

      logger.info("Removed itinerary \(itineraryId) from favorites")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to remove from favorites: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Fetch user's favorited itineraries
  func fetchFavoritedItineraries(collectionId: String? = nil, page: Int = 1, refresh: Bool = false) async {
    if refresh {
      favoritedItineraries = []
      favoritesPage = 1
    }

    guard !isLoadingFavorites else { return }
    isLoadingFavorites = true
    errorMessage = nil

    do {
      var queryItems = [
        URLQueryItem(name: "page", value: String(page)),
        URLQueryItem(name: "pageSize", value: "20"),
      ]
      if let collectionId {
        queryItems.append(URLQueryItem(name: "collectionId", value: collectionId))
      }

      let response: FavoritesListResponse = try await apiClient.fetch(
        path: "me/favorites",
        queryItems: queryItems
      )

      if refresh || page == 1 {
        favoritedItineraries = response.data
        // Update favorited IDs
        favoritedIds = Set(response.data.map(\.itineraryId))
      } else {
        favoritedItineraries.append(contentsOf: response.data)
        response.data.forEach { favoritedIds.insert($0.itineraryId) }
      }

      favoritesPage = response.meta?.page ?? page
      favoritesTotalPages = (response.meta?.total ?? 0) / (response.meta?.limit ?? 20) + 1
      totalFavoritesCount = response.meta?.total ?? favoritedItineraries.count

      logger.info("Fetched \(response.data.count) favorited itineraries")
    } catch {
      logger.error("Failed to fetch favorited itineraries: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingFavorites = false
  }

  /// Batch check favorite status for multiple itineraries
  func batchCheckFavorites(itineraryIds: [String]) async {
    guard !itineraryIds.isEmpty else { return }

    do {
      let response: BatchFavoritesCheckResponse = try await apiClient.post(
        path: "me/favorites/batch-check",
        body: ["itineraryIds": itineraryIds]
      )

      for (id, isFavorited) in response.data {
        if isFavorited {
          favoritedIds.insert(id)
        } else {
          favoritedIds.remove(id)
        }
      }

      logger.info("Batch checked \(itineraryIds.count) itinerary favorites")
    } catch {
      logger.error("Failed to batch check favorites: \(error.localizedDescription)")
    }
  }

  /// Move favorite to a different collection
  func moveFavoriteToCollection(favoriteId: String, collectionId: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      let _: GenericSuccessResponse = try await apiClient.put(
        path: "me/favorites/\(favoriteId)/move",
        body: ["collectionId": collectionId]
      )

      // Update local state
      if favoritedItineraries.contains(where: { $0.id == favoriteId }) {
        // Note: Would need mutable model to update collectionId
        // For now, trigger a refresh
        await fetchFavoritedItineraries(refresh: true)
      }

      logger.info("Moved favorite \(favoriteId) to collection \(collectionId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to move favorite: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Update favorite notes
  func updateFavoriteNotes(favoriteId: String, notes: String?) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      let _: GenericSuccessResponse = try await apiClient.patch(
        path: "me/favorites/\(favoriteId)/notes",
        body: ["notes": notes ?? ""]
      )

      logger.info("Updated notes for favorite \(favoriteId)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to update favorite notes: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  // MARK: - Collection Operations

  /// Fetch user's collections
  func fetchCollections() async {
    guard !isLoadingCollections else { return }
    isLoadingCollections = true
    errorMessage = nil

    do {
      let response: CollectionsListResponse = try await apiClient.fetch(path: "collections")
      collections = response.data
      logger.info("Fetched \(response.data.count) collections")
    } catch {
      logger.error("Failed to fetch collections: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingCollections = false
  }

  /// Fetch a single collection with its items
  func fetchCollection(id: String, page: Int = 1) async {
    guard !isLoadingCollections else { return }
    isLoadingCollections = true
    errorMessage = nil

    do {
      let response: CollectionResponse = try await apiClient.fetch(
        path: "collections/\(id)",
        queryItems: [
          URLQueryItem(name: "page", value: String(page)),
          URLQueryItem(name: "pageSize", value: "20"),
        ]
      )
      selectedCollection = response.data
      logger.info("Fetched collection \(id) with \(response.data.items.count) items")
    } catch {
      logger.error("Failed to fetch collection: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }

    isLoadingCollections = false
  }

  /// Create a new collection
  func createCollection(name: String, description: String? = nil, coverImageUrl: String? = nil) async -> String? {
    guard !isSubmitting else { return nil }
    isSubmitting = true
    errorMessage = nil

    do {
      var body: [String: Any] = ["name": name]
      if let description, !description.isEmpty {
        body["description"] = description
      }
      if let coverImageUrl {
        body["coverImageUrl"] = coverImageUrl
      }

      let response: CollectionCreateResponse = try await apiClient.post(
        path: "collections",
        body: body
      )

      // Refresh collections list
      await fetchCollections()

      logger.info("Created collection \(name)")
      isSubmitting = false
      return response.data.collectionId
    } catch {
      logger.error("Failed to create collection: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return nil
    }
  }

  /// Update a collection
  func updateCollection(id: String, name: String? = nil, description: String? = nil, coverImageUrl: String? = nil) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      var body: [String: Any] = [:]
      if let name {
        body["name"] = name
      }
      if let description {
        body["description"] = description
      }
      if let coverImageUrl {
        body["coverImageUrl"] = coverImageUrl
      }

      let _: CollectionResponse = try await apiClient.put(
        path: "collections/\(id)",
        body: body
      )

      // Refresh collections list
      await fetchCollections()

      logger.info("Updated collection \(id)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to update collection: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Delete a collection
  func deleteCollection(id: String) async -> Bool {
    guard !isSubmitting else { return false }
    isSubmitting = true
    errorMessage = nil

    do {
      try await apiClient.delete(path: "collections/\(id)")

      // Remove from local list
      collections.removeAll { $0.id == id }
      if selectedCollection?.id == id {
        selectedCollection = nil
      }

      logger.info("Deleted collection \(id)")
      isSubmitting = false
      return true
    } catch {
      logger.error("Failed to delete collection: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isSubmitting = false
      return false
    }
  }

  /// Get or create default collection
  func getOrCreateDefaultCollection() async -> FavoriteCollection? {
    do {
      let _: CollectionResponse = try await apiClient.fetch(path: "collections/default")

      // Update collections list
      await fetchCollections()

      return collections.first { $0.isDefault }
    } catch {
      logger.error("Failed to get default collection: \(error.localizedDescription)")
      return nil
    }
  }

  // MARK: - Helpers

  /// Clear all data
  func clear() {
    likedItineraries = []
    likedIds = []
    likeCounts = [:]
    favoritedItineraries = []
    favoritedIds = []
    favoriteCounts = [:]
    collections = []
    selectedCollection = nil
    likesPage = 1
    favoritesPage = 1
    errorMessage = nil
  }

  /// Load more liked itineraries
  func loadMoreLikes() async {
    guard likesPage < likesTotalPages else { return }
    await fetchLikedItineraries(page: likesPage + 1)
  }

  /// Load more favorited itineraries
  func loadMoreFavorites(collectionId: String? = nil) async {
    guard favoritesPage < favoritesTotalPages else { return }
    await fetchFavoritedItineraries(collectionId: collectionId, page: favoritesPage + 1)
  }

  /// Prefetch like/favorite status for a list of itineraries
  func prefetchStatus(for itineraryIds: [String]) async {
    await withTaskGroup(of: Void.self) { group in
      group.addTask {
        await self.batchCheckLikes(itineraryIds: itineraryIds)
      }
      group.addTask {
        await self.batchCheckFavorites(itineraryIds: itineraryIds)
      }
    }
  }
}
