import Foundation
import OSLog

/// Store for managing share links, events, and statistics
@Observable
@MainActor
final class ShareStore {
  static let shared = ShareStore()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "ShareStore")

  // MARK: - State

  /// Share links for the current resource
  var shareLinks: [ShareLink] = []

  /// Share statistics for the current resource
  var stats: ShareStats?

  /// User's share history
  var shareHistory: [ShareHistoryItem] = []

  /// Top shared resources
  var topShared: [TopSharedResource] = []

  /// Current share link being viewed/edited
  var currentShareLink: ShareLink?

  /// Most recently created share link result
  var lastCreatedLink: CreateShareLinkResult?

  // MARK: - Loading States

  var isLoadingLinks = false
  var isLoadingStats = false
  var isLoadingHistory = false
  var isLoadingTopShared = false
  var isCreatingLink = false
  var isUpdatingLink = false

  // MARK: - Pagination

  var historyHasMore = false
  var historyCursor: String?

  // MARK: - Error

  var error: Error?

  private init() {}

  // MARK: - Share Links

  /// Load share links for a resource
  func loadShareLinks(
    resourceType: ShareResourceType,
    resourceId: String
  ) async {
    guard !isLoadingLinks else { return }
    isLoadingLinks = true
    error = nil

    do {
      let endpoint = "share/links?resource_type=\(resourceType.rawValue)&resource_id=\(resourceId)"
      let data = try await NetworkClient.shared.fetchData(endpoint: endpoint)
      let response = try JSONDecoder().decode(ShareLinksResponse.self, from: data)
      shareLinks = response.data
      logger.info("Loaded \(self.shareLinks.count) share links")
    } catch {
      self.error = error
      logger.error("Failed to load share links: \(error.localizedDescription)")
    }

    isLoadingLinks = false
  }

  /// Create a new share link
  func createShareLink(
    resourceType: ShareResourceType,
    resourceId: String,
    platform: SharePlatform,
    permission: SharePermission? = nil,
    password: String? = nil,
    expiresInDays: Int? = nil,
    maxViews: Int? = nil,
    allowDownload: Bool? = nil,
    allowCopy: Bool? = nil
  ) async -> CreateShareLinkResult? {
    guard !isCreatingLink else { return nil }
    isCreatingLink = true
    error = nil

    do {
      let request = CreateShareLinkRequest(
        resourceType: resourceType,
        resourceId: resourceId,
        platform: platform,
        permission: permission,
        password: password,
        expiresInDays: expiresInDays,
        maxViews: maxViews,
        allowDownload: allowDownload,
        allowCopy: allowCopy
      )

      let bodyData = try JSONEncoder().encode(request)

      let data = try await NetworkClient.shared.postDataWithBody(endpoint: "share/links", bodyData: bodyData)
      let response = try JSONDecoder().decode(CreateShareLinkResponse.self, from: data)

      if let result = response.data {
        lastCreatedLink = result
        logger.info("Created share link: \(result.shareCode)")
      }

      isCreatingLink = false
      return response.data
    } catch {
      self.error = error
      logger.error("Failed to create share link: \(error.localizedDescription)")
      isCreatingLink = false
      return nil
    }
  }

  /// Quick share an itinerary
  func shareItinerary(
    itineraryId: String,
    platform: SharePlatform,
    permission: SharePermission? = nil,
    password: String? = nil,
    expiresInDays: Int? = nil
  ) async -> CreateShareLinkResult? {
    guard !isCreatingLink else { return nil }
    isCreatingLink = true
    error = nil

    do {
      var body: [String: Any] = ["platform": platform.rawValue]
      if let permission { body["permission"] = permission.rawValue }
      if let password { body["password"] = password }
      if let expiresInDays { body["expires_in_days"] = expiresInDays }

      let data = try await NetworkClient.shared.postData(
        endpoint: "itineraries/\(itineraryId)/share",
        body: body
      )
      let response = try JSONDecoder().decode(CreateShareLinkResponse.self, from: data)

      if let result = response.data {
        lastCreatedLink = result
        logger.info("Shared itinerary: \(result.shareCode)")
      }

      isCreatingLink = false
      return response.data
    } catch {
      self.error = error
      logger.error("Failed to share itinerary: \(error.localizedDescription)")
      isCreatingLink = false
      return nil
    }
  }

  /// Update a share link
  func updateShareLink(
    shareLinkId: String,
    permission: SharePermission? = nil,
    password: String? = nil,
    expiresInDays: Int? = nil,
    maxViews: Int? = nil,
    allowDownload: Bool? = nil,
    allowCopy: Bool? = nil,
    isActive: Bool? = nil
  ) async -> Bool {
    guard !isUpdatingLink else { return false }
    isUpdatingLink = true
    error = nil

    do {
      var body: [String: Any] = [:]
      if let permission { body["permission"] = permission.rawValue }
      if let password { body["password"] = password }
      if let expiresInDays { body["expires_in_days"] = expiresInDays }
      if let maxViews { body["max_views"] = maxViews }
      if let allowDownload { body["allow_download"] = allowDownload }
      if let allowCopy { body["allow_copy"] = allowCopy }
      if let isActive { body["is_active"] = isActive }

      _ = try await NetworkClient.shared.patchData(endpoint: "share/links/\(shareLinkId)", body: body)
      logger.info("Updated share link: \(shareLinkId)")

      isUpdatingLink = false
      return true
    } catch {
      self.error = error
      logger.error("Failed to update share link: \(error.localizedDescription)")
      isUpdatingLink = false
      return false
    }
  }

  /// Revoke a share link
  func revokeShareLink(shareLinkId: String) async -> Bool {
    do {
      _ = try await NetworkClient.shared.postData(
        endpoint: "share/links/\(shareLinkId)/revoke",
        body: [:]
      )

      // Update local state
      if let index = shareLinks.firstIndex(where: { $0.id == shareLinkId }) {
        shareLinks.remove(at: index)
      }

      logger.info("Revoked share link: \(shareLinkId)")
      return true
    } catch {
      self.error = error
      logger.error("Failed to revoke share link: \(error.localizedDescription)")
      return false
    }
  }

  /// Delete a share link permanently
  func deleteShareLink(shareLinkId: String) async -> Bool {
    do {
      _ = try await NetworkClient.shared.deleteData(endpoint: "share/links/\(shareLinkId)")

      // Update local state
      shareLinks.removeAll { $0.id == shareLinkId }

      logger.info("Deleted share link: \(shareLinkId)")
      return true
    } catch {
      self.error = error
      logger.error("Failed to delete share link: \(error.localizedDescription)")
      return false
    }
  }

  // MARK: - Statistics

  /// Load share statistics for a resource
  func loadStats(resourceType: ShareResourceType, resourceId: String) async {
    guard !isLoadingStats else { return }
    isLoadingStats = true
    error = nil

    do {
      let endpoint = "share/stats?resource_type=\(resourceType.rawValue)&resource_id=\(resourceId)"
      let data = try await NetworkClient.shared.fetchData(endpoint: endpoint)
      let response = try JSONDecoder().decode(ShareStatsResponse.self, from: data)
      stats = response.data
      logger.info("Loaded share stats")
    } catch {
      self.error = error
      logger.error("Failed to load share stats: \(error.localizedDescription)")
    }

    isLoadingStats = false
  }

  /// Load share statistics for an itinerary
  func loadItineraryStats(itineraryId: String) async {
    guard !isLoadingStats else { return }
    isLoadingStats = true
    error = nil

    do {
      let data = try await NetworkClient.shared.fetchData(
        endpoint: "itineraries/\(itineraryId)/share/stats"
      )
      let response = try JSONDecoder().decode(ShareStatsResponse.self, from: data)
      stats = response.data
      logger.info("Loaded itinerary share stats")
    } catch {
      self.error = error
      logger.error("Failed to load itinerary share stats: \(error.localizedDescription)")
    }

    isLoadingStats = false
  }

  // MARK: - Share History

  /// Load user's share history
  func loadShareHistory(refresh: Bool = false) async {
    guard !isLoadingHistory else { return }

    if refresh {
      shareHistory = []
      historyCursor = nil
      historyHasMore = false
    }

    isLoadingHistory = true
    error = nil

    do {
      var endpoint = "share/history?limit=20"
      if let cursor = historyCursor {
        endpoint += "&cursor=\(cursor)"
      }

      let data = try await NetworkClient.shared.fetchData(endpoint: endpoint)
      let response = try JSONDecoder().decode(ShareHistoryResponse.self, from: data)

      if refresh {
        shareHistory = response.data
      } else {
        shareHistory.append(contentsOf: response.data)
      }

      historyHasMore = response.meta?.hasMore ?? false
      historyCursor = response.meta?.nextCursor

      logger.info("Loaded \(response.data.count) share history items")
    } catch {
      self.error = error
      logger.error("Failed to load share history: \(error.localizedDescription)")
    }

    isLoadingHistory = false
  }

  // MARK: - Top Shared

  /// Load top shared resources
  func loadTopShared(
    resourceType: ShareResourceType? = nil,
    days: Int? = nil,
    limit: Int? = nil
  ) async {
    guard !isLoadingTopShared else { return }
    isLoadingTopShared = true
    error = nil

    do {
      var endpoint = "share/top?"
      if let resourceType { endpoint += "resource_type=\(resourceType.rawValue)&" }
      if let days { endpoint += "days=\(days)&" }
      if let limit { endpoint += "limit=\(limit)&" }

      let data = try await NetworkClient.shared.fetchData(endpoint: endpoint)
      let response = try JSONDecoder().decode(TopSharedResponse.self, from: data)
      topShared = response.data
      logger.info("Loaded \(self.topShared.count) top shared resources")
    } catch {
      self.error = error
      logger.error("Failed to load top shared: \(error.localizedDescription)")
    }

    isLoadingTopShared = false
  }

  // MARK: - Event Tracking

  /// Track a share event (for analytics)
  func trackEvent(
    resourceId: String,
    platform: SharePlatform,
    resourceType: ShareResourceType? = nil,
    shareUrl: String? = nil
  ) async {
    do {
      var body: [String: Any] = [
        "resource_id": resourceId,
        "platform": platform.rawValue
      ]
      if let resourceType { body["resource_type"] = resourceType.rawValue }
      if let shareUrl { body["share_url"] = shareUrl }

      _ = try await NetworkClient.shared.postData(endpoint: "share/events", body: body)
      logger.info("Tracked share event for resource: \(resourceId)")
    } catch {
      logger.error("Failed to track share event: \(error.localizedDescription)")
    }
  }

  // MARK: - Helpers

  /// Clear all cached data
  func clearCache() {
    shareLinks = []
    stats = nil
    shareHistory = []
    topShared = []
    currentShareLink = nil
    lastCreatedLink = nil
    historyHasMore = false
    historyCursor = nil
    error = nil
    logger.info("Share cache cleared")
  }

  /// Get a shareable URL for quick sharing
  func getShareableURL(shareCode: String) -> URL? {
    URL(string: "https://pathfinding.app/s/\(shareCode)")
  }
}
