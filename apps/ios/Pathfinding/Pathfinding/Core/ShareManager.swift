import Foundation
import OSLog
import SwiftUI
import UIKit

// MARK: - Share Content

/// Content to be shared
struct ShareContent {
  let title: String
  let description: String?
  let url: URL?
  let image: UIImage?
  let hashtags: [String]

  init(
    title: String,
    description: String? = nil,
    url: URL? = nil,
    image: UIImage? = nil,
    hashtags: [String] = []
  ) {
    self.title = title
    self.description = description
    self.url = url
    self.image = image
    self.hashtags = hashtags
  }

  /// Generate text content for sharing
  var textContent: String {
    var parts: [String] = [title]

    if let description = description {
      parts.append(description)
    }

    if !hashtags.isEmpty {
      let tags = hashtags.map { "#\($0)" }.joined(separator: " ")
      parts.append(tags)
    }

    if let url = url {
      parts.append(url.absoluteString)
    }

    return parts.joined(separator: "\n\n")
  }

  /// Generate Weibo-formatted content
  var weiboContent: String {
    var content = title

    if let description = description {
      content += "\n\n\(description)"
    }

    if !hashtags.isEmpty {
      let tags = hashtags.map { "#\($0)#" }.joined(separator: " ")
      content += "\n\n\(tags)"
    }

    if let url = url {
      content += "\n\n\(url.absoluteString)"
    }

    return content
  }

  /// Generate WeChat-formatted content
  var wechatContent: String {
    var content = title

    if let description = description?.prefix(50) {
      content += " - \(description)"
    }

    return content
  }
}

// MARK: - Share Result

/// Result of a share operation
struct ShareResult {
  let success: Bool
  let platform: SharePlatform
  let error: ShareError?
}

// MARK: - Share Error

enum ShareError: LocalizedError {
  case platformNotInstalled(SharePlatform)
  case imageGenerationFailed
  case sharingCancelled
  case networkError(Error)
  case unknown(Error)

  var errorDescription: String? {
    switch self {
    case .platformNotInstalled(let platform):
      return "\(platform.displayName)未安装"
    case .imageGenerationFailed:
      return "生成分享图片失败"
    case .sharingCancelled:
      return "分享已取消"
    case .networkError(let error):
      return "网络错误: \(error.localizedDescription)"
    case .unknown(let error):
      return "分享失败: \(error.localizedDescription)"
    }
  }
}

// MARK: - Share Manager

/// Manages social media sharing operations
@MainActor
@Observable
final class ShareManager {
  static let shared = ShareManager()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "ShareManager")

  // Share state
  private(set) var isSharing = false
  private(set) var lastShareResult: ShareResult?

  // Statistics
  private(set) var shareStats: ShareStats?
  private(set) var recentShares: [ShareHistoryItem] = []

  private init() {}

  // MARK: - Platform Availability

  /// Check if a platform is available for sharing
  func isPlatformAvailable(_ platform: SharePlatform) -> Bool {
    switch platform {
    case .wechat:
      return canOpenURL("weixin://")
    case .weibo:
      return canOpenURL("sinaweibo://")
    case .xiaohongshu:
      return canOpenURL("xhsdiscover://")
    case .qq:
      return canOpenURL("mqq://")
    case .douyin:
      return canOpenURL("snssdk1128://")
    case .copyLink, .systemShare, .generic:
      return true
    }
  }

  /// Get all available platforms
  func availablePlatforms() -> [SharePlatform] {
    SharePlatform.allCases.filter { isPlatformAvailable($0) }
  }

  /// Get social platforms that are installed
  func installedSocialPlatforms() -> [SharePlatform] {
    let socialPlatforms: [SharePlatform] = [.wechat, .weibo, .xiaohongshu, .qq, .douyin]
    return socialPlatforms.filter { isPlatformAvailable($0) }
  }

  private func canOpenURL(_ urlString: String) -> Bool {
    guard let url = URL(string: urlString) else { return false }
    return UIApplication.shared.canOpenURL(url)
  }

  // MARK: - Sharing Methods

  /// Share content to a specific platform
  func share(
    content: ShareContent,
    to platform: SharePlatform,
    from viewController: UIViewController? = nil
  ) async -> ShareResult {
    isSharing = true
    defer { isSharing = false }

    logger.info("Sharing to \(platform.rawValue)")

    do {
      switch platform {
      case .wechat:
        try await shareToWeChat(content: content)

      case .weibo:
        try await shareToWeibo(content: content)

      case .xiaohongshu:
        try await shareToXiaohongshu(content: content)

      case .qq:
        try await shareToQQ(content: content)

      case .douyin:
        try await shareToDouyin(content: content)

      case .copyLink:
        try await copyLink(content: content)

      case .systemShare, .generic:
        try await systemShare(content: content, from: viewController)
      }

      let result = ShareResult(success: true, platform: platform, error: nil)
      lastShareResult = result
      logger.info("Share to \(platform.rawValue) succeeded")
      return result

    } catch let error as ShareError {
      let result = ShareResult(success: false, platform: platform, error: error)
      lastShareResult = result
      logger.error("Share to \(platform.rawValue) failed: \(error.localizedDescription)")
      return result

    } catch {
      let shareError = ShareError.unknown(error)
      let result = ShareResult(success: false, platform: platform, error: shareError)
      lastShareResult = result
      logger.error("Share to \(platform.rawValue) failed: \(error.localizedDescription)")
      return result
    }
  }

  // MARK: - Platform-Specific Sharing

  private func shareToWeChat(content: ShareContent) async throws {
    guard isPlatformAvailable(.wechat) else {
      throw ShareError.platformNotInstalled(.wechat)
    }

    // WeChat requires SDK integration for full functionality
    // For now, we use a URL scheme approach
    var urlString = "weixin://dl/moments"

    if let url = content.url {
      // Encode the URL for sharing
      if let encoded = url.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
        urlString += "?url=\(encoded)"
      }
    }

    if let url = URL(string: urlString) {
      _ = await UIApplication.shared.open(url)
    }
  }

  private func shareToWeibo(content: ShareContent) async throws {
    guard isPlatformAvailable(.weibo) else {
      throw ShareError.platformNotInstalled(.weibo)
    }

    // Build Weibo share URL
    var components = URLComponents(string: "sinaweibo://compose")
    var queryItems: [URLQueryItem] = []

    queryItems.append(URLQueryItem(name: "content", value: content.weiboContent))

    if let url = content.url {
      queryItems.append(URLQueryItem(name: "url", value: url.absoluteString))
    }

    components?.queryItems = queryItems

    if let url = components?.url {
      _ = await UIApplication.shared.open(url)
    }
  }

  private func shareToXiaohongshu(content: ShareContent) async throws {
    guard isPlatformAvailable(.xiaohongshu) else {
      throw ShareError.platformNotInstalled(.xiaohongshu)
    }

    // Xiaohongshu deep link
    // Note: Full integration requires their SDK
    let urlString = "xhsdiscover://share"

    if let url = URL(string: urlString) {
      _ = await UIApplication.shared.open(url)
    }
  }

  private func shareToQQ(content: ShareContent) async throws {
    guard isPlatformAvailable(.qq) else {
      throw ShareError.platformNotInstalled(.qq)
    }

    // QQ share URL scheme
    var urlString = "mqq://share/to_fri"

    if let url = content.url {
      if let encoded = url.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
        urlString += "?url=\(encoded)&title=\(content.title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
      }
    }

    if let url = URL(string: urlString) {
      _ = await UIApplication.shared.open(url)
    }
  }

  private func shareToDouyin(content: ShareContent) async throws {
    guard isPlatformAvailable(.douyin) else {
      throw ShareError.platformNotInstalled(.douyin)
    }

    // Douyin deep link
    let urlString = "snssdk1128://share"

    if let url = URL(string: urlString) {
      _ = await UIApplication.shared.open(url)
    }
  }

  private func copyLink(content: ShareContent) async throws {
    if let url = content.url {
      UIPasteboard.general.string = url.absoluteString
    } else {
      UIPasteboard.general.string = content.textContent
    }
  }

  private func systemShare(content: ShareContent, from viewController: UIViewController?) async throws {
    var items: [Any] = [content.textContent]

    if let image = content.image {
      items.append(image)
    }

    if let url = content.url {
      items.append(url)
    }

    let activityVC = UIActivityViewController(activityItems: items, applicationActivities: nil)

    // Exclude some activity types that don't make sense
    activityVC.excludedActivityTypes = [
      .addToReadingList,
      .assignToContact,
      .openInIBooks
    ]

    // Get the presenting view controller
    let topVC = await getTopViewController()
    let presenter = viewController ?? topVC

    guard let presenter = presenter else {
      throw ShareError.sharingCancelled
    }

    // For iPad, set the popover presentation
    if let popover = activityVC.popoverPresentationController {
      popover.sourceView = presenter.view
      popover.sourceRect = CGRect(
        x: presenter.view.bounds.midX,
        y: presenter.view.bounds.midY,
        width: 0,
        height: 0
      )
      popover.permittedArrowDirections = []
    }

    presenter.present(activityVC, animated: true)
  }

  private func getTopViewController() async -> UIViewController? {
    guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
          let window = windowScene.windows.first,
          var topController = window.rootViewController
    else {
      return nil
    }

    while let presented = topController.presentedViewController {
      topController = presented
    }

    return topController
  }

  // MARK: - Share Statistics

  /// Record a share event
  func recordShareEvent(
    resourceType: ShareResourceType,
    resourceId: String,
    platform: SharePlatform,
    shareUrl: String? = nil
  ) async {
    // This would call the API to record the share event
    logger.info("Recorded share event for \(resourceType.rawValue)/\(resourceId) to \(platform.rawValue)")
  }

  /// Fetch share statistics for a resource
  func fetchShareStats(resourceType: ShareResourceType, resourceId: String) async throws -> ShareStats {
    // This would call the API to fetch stats
    // For now, return cached stats if available
    if let stats = shareStats {
      return stats
    }

    // Placeholder - would be replaced with actual API call
    throw APIError.notFound
  }

  /// Fetch user's share history
  func fetchShareHistory(limit: Int = 20, cursor: String? = nil) async throws -> [ShareHistoryItem] {
    // This would call the API to fetch history
    // Placeholder implementation
    return recentShares
  }

  // MARK: - Share Link Management

  /// Create a share link for a resource
  func createShareLink(
    resourceType: ShareResourceType,
    resourceId: String,
    platform: SharePlatform,
    permission: SharePermission = .unlisted,
    password: String? = nil,
    expiresInDays: Int? = nil,
    maxViews: Int? = nil
  ) async throws -> CreateShareLinkResult {
    // This would call the API to create a share link
    // Placeholder implementation
    throw APIError.notFound
  }

  /// Verify access to a share link
  func verifyShareLinkAccess(shareCode: String, password: String? = nil) async throws -> ShareAccessVerification {
    // This would call the API to verify access
    throw APIError.notFound
  }
}

// MARK: - Share Content Builders

extension ShareManager {
  /// Build share content from a BlogPost
  func buildShareContent(from blogPost: BlogPost, shareUrl: URL? = nil) -> ShareContent {
    let description = blogPost.aiSummary ?? blogPost.summary ?? blogPost.content?.prefix(100).description

    var hashtags = ["探路", "旅行"]
    if let destinations = blogPost.destinations {
      hashtags.append(contentsOf: destinations.prefix(3))
    }

    return ShareContent(
      title: blogPost.title,
      description: description,
      url: shareUrl,
      hashtags: hashtags
    )
  }

  /// Build share content from an APIItinerary
  func buildShareContent(from itinerary: APIItinerary, shareUrl: URL? = nil) -> ShareContent {
    var description: String?
    if let cityName = itinerary.cityName, let daysCount = itinerary.daysCount {
      description = "\(cityName) \(daysCount)日游行程"
    }

    var hashtags = ["探路", "旅行规划"]
    if let cityName = itinerary.cityName {
      hashtags.append(cityName)
    }

    return ShareContent(
      title: itinerary.title,
      description: description,
      url: shareUrl,
      hashtags: hashtags
    )
  }
}
