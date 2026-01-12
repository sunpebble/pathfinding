import Foundation

/// App configuration for different environments
enum AppConfig {
  // MARK: - Environment

  enum Environment: String {
    case development
    case staging
    case production

    static var current: Environment {
      #if DEBUG
        return .development
      #else
        return .production
      #endif
    }
  }

  // MARK: - API Configuration

  static var apiBaseURL: String {
    switch Environment.current {
    case .development:
      return "http://127.0.0.1:3001"
    case .staging:
      return "https://staging-api.pathfinding.org"
    case .production:
      return "https://api.pathfinding.org"
    }
  }

  // MARK: - Cache Configuration

  static let imageCacheSizeLimit = 100 * 1024 * 1024  // 100 MB
  static let imageCacheCountLimit = 200
  static let apiCacheValiditySeconds: TimeInterval = 5 * 60  // 5 minutes

  // MARK: - Network Configuration

  static let networkTimeoutRequest: TimeInterval = 30
  static let networkTimeoutResource: TimeInterval = 60
  static let maxRetryAttempts = 3

  // MARK: - Performance Configuration

  static let maxItineraryLoadBatch = 20  // Load itineraries in batches of 20
  static let mapAnnotationLimit = 100  // Maximum annotations to show on map at once
  static let poiRenderBatchSize = 10  // Render POIs in batches of 10
  static let memoryWarningThreshold = 150 * 1024 * 1024  // 150 MB - trigger cleanup

  // MARK: - App Info

  static var appVersion: String {
    Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
  }

  static var buildNumber: String {
    Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
  }
}
