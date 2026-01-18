import Foundation
import OSLog

/// Store for managing user follow operations and state
@Observable
@MainActor
final class FollowStore {
  static let shared = FollowStore()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "FollowStore")

  // Current user's followers and following
  var followers: [FollowUser] = []
  var following: [FollowUser] = []
  var mutualFollowers: [FollowUser] = []
  var recommendations: [FollowRecommendation] = []

  // Loading states
  var isLoadingFollowers = false
  var isLoadingFollowing = false
  var isLoadingMutuals = false
  var isLoadingRecommendations = false
  var isFollowing = false

  // Pagination
  var followersPagination: FollowPaginationMeta?
  var followingPagination: FollowPaginationMeta?
  var mutualsPagination: FollowPaginationMeta?

  // Follow status cache
  private var followStatusCache: [String: FollowStatus] = [:]

  // Error handling
  var error: Error?

  private init() {}

  // MARK: - Fetch Followers

  func fetchFollowers(page: Int = 1, pageSize: Int = 20) async {
    guard !isLoadingFollowers else { return }
    isLoadingFollowers = true
    error = nil

    do {
      let url = "\(AppConfig.convexURL)/v1/follows/followers?page=\(page)&pageSize=\(pageSize)"
      let response: FollowListResponse = try await performAuthenticatedRequest(url: url)

      if page == 1 {
        followers = response.data
      } else {
        followers.append(contentsOf: response.data)
      }
      followersPagination = response.meta

      logger.info("Loaded \(response.data.count) followers")
    } catch {
      self.error = error
      logger.error("Failed to fetch followers: \(String(describing: error))")
    }

    isLoadingFollowers = false
  }

  // MARK: - Fetch Following

  func fetchFollowing(page: Int = 1, pageSize: Int = 20) async {
    guard !isLoadingFollowing else { return }
    isLoadingFollowing = true
    error = nil

    do {
      let url = "\(AppConfig.convexURL)/v1/follows/following?page=\(page)&pageSize=\(pageSize)"
      let response: FollowListResponse = try await performAuthenticatedRequest(url: url)

      if page == 1 {
        following = response.data
      } else {
        following.append(contentsOf: response.data)
      }
      followingPagination = response.meta

      logger.info("Loaded \(response.data.count) following")
    } catch {
      self.error = error
      logger.error("Failed to fetch following: \(String(describing: error))")
    }

    isLoadingFollowing = false
  }

  // MARK: - Fetch Mutual Followers

  func fetchMutualFollowers(page: Int = 1, pageSize: Int = 20) async {
    guard !isLoadingMutuals else { return }
    isLoadingMutuals = true
    error = nil

    do {
      let url = "\(AppConfig.convexURL)/v1/follows/mutual?page=\(page)&pageSize=\(pageSize)"
      let response: FollowListResponse = try await performAuthenticatedRequest(url: url)

      if page == 1 {
        mutualFollowers = response.data
      } else {
        mutualFollowers.append(contentsOf: response.data)
      }
      mutualsPagination = response.meta

      logger.info("Loaded \(response.data.count) mutual followers")
    } catch {
      self.error = error
      logger.error("Failed to fetch mutual followers: \(String(describing: error))")
    }

    isLoadingMutuals = false
  }

  // MARK: - Fetch Recommendations

  func fetchRecommendations(limit: Int = 10) async {
    guard !isLoadingRecommendations else { return }
    isLoadingRecommendations = true
    error = nil

    do {
      let url = "\(AppConfig.convexURL)/v1/follows/recommendations?limit=\(limit)"
      let response: FollowRecommendationsResponse = try await performAuthenticatedRequest(url: url)

      recommendations = response.data
      logger.info("Loaded \(response.data.count) follow recommendations")
    } catch {
      self.error = error
      logger.error("Failed to fetch recommendations: \(String(describing: error))")
    }

    isLoadingRecommendations = false
  }

  // MARK: - Follow User

  func followUser(_ targetUserId: String) async -> Bool {
    guard !isFollowing else { return false }
    isFollowing = true
    error = nil

    do {
      let url = "\(AppConfig.convexURL)/v1/follows/\(targetUserId)"
      let _: FollowActionResponse = try await performAuthenticatedRequest(
        url: url,
        method: "POST"
      )

      // Update cache
      if let status = followStatusCache[targetUserId] {
        followStatusCache[targetUserId] = FollowStatus(
          isFollowing: true,
          isFollowedBy: status.isFollowedBy,
          isMutual: status.isFollowedBy
        )
      } else {
        followStatusCache[targetUserId] = FollowStatus(
          isFollowing: true,
          isFollowedBy: false,
          isMutual: false
        )
      }

      // Remove from recommendations if present
      recommendations.removeAll { $0.id == targetUserId }

      logger.info("Successfully followed user \(targetUserId)")
      isFollowing = false
      return true
    } catch {
      self.error = error
      logger.error("Failed to follow user: \(String(describing: error))")
      isFollowing = false
      return false
    }
  }

  // MARK: - Unfollow User

  func unfollowUser(_ targetUserId: String) async -> Bool {
    guard !isFollowing else { return false }
    isFollowing = true
    error = nil

    do {
      let url = "\(AppConfig.convexURL)/v1/follows/\(targetUserId)"
      let _: FollowActionResponse = try await performAuthenticatedRequest(
        url: url,
        method: "DELETE"
      )

      // Update cache
      if let status = followStatusCache[targetUserId] {
        followStatusCache[targetUserId] = FollowStatus(
          isFollowing: false,
          isFollowedBy: status.isFollowedBy,
          isMutual: false
        )
      }

      // Remove from following list
      following.removeAll { $0.id == targetUserId }

      // Remove from mutuals if present
      mutualFollowers.removeAll { $0.id == targetUserId }

      logger.info("Successfully unfollowed user \(targetUserId)")
      isFollowing = false
      return true
    } catch {
      self.error = error
      logger.error("Failed to unfollow user: \(String(describing: error))")
      isFollowing = false
      return false
    }
  }

  // MARK: - Check Follow Status

  func checkFollowStatus(_ targetUserId: String) async -> FollowStatus? {
    // Check cache first
    if let cached = followStatusCache[targetUserId] {
      return cached
    }

    do {
      let url = "\(AppConfig.convexURL)/v1/follows/status/\(targetUserId)"
      let response: FollowStatusResponse = try await performAuthenticatedRequest(url: url)

      followStatusCache[targetUserId] = response.data
      return response.data
    } catch {
      logger.error("Failed to check follow status: \(String(describing: error))")
      return nil
    }
  }

  // MARK: - Batch Check Follow Status

  func batchCheckFollowStatus(_ targetUserIds: [String]) async -> [String: FollowStatus] {
    do {
      let url = "\(AppConfig.convexURL)/v1/follows/batch-status"
      let body = ["targetUserIds": targetUserIds]
      let response: BatchFollowStatusResponse = try await performAuthenticatedRequest(
        url: url,
        method: "POST",
        body: body
      )

      // Update cache
      for (userId, status) in response.data {
        followStatusCache[userId] = status
      }

      return response.data
    } catch {
      logger.error("Failed to batch check follow status: \(String(describing: error))")
      return [:]
    }
  }

  // MARK: - Get Follow Stats

  func getFollowStats(for userId: String) async -> FollowStats? {
    do {
      let url = "\(AppConfig.convexURL)/v1/follows/user/\(userId)/stats"
      let response: FollowStatsResponse = try await performPublicRequest(url: url)
      return response.data
    } catch {
      logger.error("Failed to get follow stats: \(String(describing: error))")
      return nil
    }
  }

  // MARK: - Fetch User's Followers (Public)

  func fetchUserFollowers(userId: String, page: Int = 1, pageSize: Int = 20) async -> (users: [FollowUser], meta: FollowPaginationMeta?) {
    do {
      let url = "\(AppConfig.convexURL)/v1/follows/user/\(userId)/followers?page=\(page)&pageSize=\(pageSize)"
      let response: FollowListResponse = try await performPublicRequest(url: url)
      return (response.data, response.meta)
    } catch {
      logger.error("Failed to fetch user followers: \(String(describing: error))")
      return ([], nil)
    }
  }

  // MARK: - Fetch User's Following (Public)

  func fetchUserFollowing(userId: String, page: Int = 1, pageSize: Int = 20) async -> (users: [FollowUser], meta: FollowPaginationMeta?) {
    do {
      let url = "\(AppConfig.convexURL)/v1/follows/user/\(userId)/following?page=\(page)&pageSize=\(pageSize)"
      let response: FollowListResponse = try await performPublicRequest(url: url)
      return (response.data, response.meta)
    } catch {
      logger.error("Failed to fetch user following: \(String(describing: error))")
      return ([], nil)
    }
  }

  // MARK: - Clear Cache

  func clearCache() {
    followStatusCache.removeAll()
    followers.removeAll()
    following.removeAll()
    mutualFollowers.removeAll()
    recommendations.removeAll()
  }

  // MARK: - Is Following (Cached)

  func isFollowing(_ userId: String) -> Bool {
    return followStatusCache[userId]?.isFollowing ?? false
  }

  // MARK: - Helper Methods

  private func performAuthenticatedRequest<T: Decodable>(
    url: String,
    method: String = "GET",
    body: Encodable? = nil
  ) async throws -> T {
    guard let url = URL(string: url) else {
      throw APIError.invalidURL
    }

    var request = URLRequest(url: url)
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    // Add auth token
    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    // Add body if present
    if let body = body {
      request.httpBody = try JSONEncoder().encode(AnyEncodable(body))
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw APIError.invalidResponse
    }

    guard httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      if httpResponse.statusCode == 401 {
        throw APIError.unauthorized
      }
      throw APIError.httpError(httpResponse.statusCode)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  private func performPublicRequest<T: Decodable>(url: String) async throws -> T {
    guard let url = URL(string: url) else {
      throw APIError.invalidURL
    }

    let (data, response) = try await URLSession.shared.data(from: url)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw APIError.invalidResponse
    }

    guard httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      throw APIError.httpError(httpResponse.statusCode)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }
}

// MARK: - AnyEncodable Helper

private struct AnyEncodable: Encodable {
  private let encode: (Encoder) throws -> Void

  init<T: Encodable>(_ value: T) {
    encode = value.encode
  }

  func encode(to encoder: Encoder) throws {
    try encode(encoder)
  }
}
