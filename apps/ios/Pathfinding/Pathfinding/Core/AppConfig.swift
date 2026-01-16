import Foundation

/// App configuration that reads from build settings via Info.plist
/// Values are set in .xcconfig files and passed through at compile time
enum AppConfig {
  // MARK: - Environment

  enum Environment: String {
    case development
    case staging
    case production

    static var current: Environment {
      guard let envString = Bundle.main.infoDictionary?["PFEnvironment"] as? String,
        let env = Environment(rawValue: envString)
      else {
        #if DEBUG
          return .development
        #else
          return .production
        #endif
      }
      return env
    }
  }

  // MARK: - Build Configuration Helpers

  private static func infoPlistValue<T>(forKey key: String) -> T? {
    Bundle.main.infoDictionary?[key] as? T
  }

  private static func infoPlistString(forKey key: String) -> String? {
    infoPlistValue(forKey: key)
  }

  private static func infoPlistBool(forKey key: String) -> Bool {
    guard let value: String = infoPlistValue(forKey: key) else { return false }
    return value.uppercased() == "YES" || value == "1" || value.uppercased() == "TRUE"
  }

  private static func infoPlistInt(forKey key: String) -> Int? {
    guard let value: String = infoPlistValue(forKey: key) else { return nil }
    return Int(value)
  }

  // MARK: - API Configuration

  static var apiBaseURL: String {
    // Read from Info.plist (set via xcconfig)
    if let url = infoPlistString(forKey: "PFAPIBaseURL"), !url.isEmpty {
      return url
    }
    // Fallback based on environment
    switch Environment.current {
    case .development:
      return "http://127.0.0.1:3001"
    case .staging:
      return "https://staging-api.pathfinding.org"
    case .production:
      return "https://api.pathfinding.org"
    }
  }

  // MARK: - Feature Flags

  static var isDebugLoggingEnabled: Bool {
    infoPlistBool(forKey: "PFEnableDebugLogging")
  }

  static var isNetworkLoggingEnabled: Bool {
    infoPlistBool(forKey: "PFEnableNetworkLogging")
  }

  // MARK: - Cache Configuration

  static let imageCacheSizeLimit = 100 * 1024 * 1024  // 100 MB
  static let imageCacheCountLimit = 200
  static let apiCacheValiditySeconds: TimeInterval = 5 * 60  // 5 minutes

  // MARK: - Network Configuration

  static var networkTimeoutRequest: TimeInterval {
    TimeInterval(infoPlistInt(forKey: "PFAPITimeout") ?? 30)
  }

  static var networkTimeoutResource: TimeInterval {
    networkTimeoutRequest * 2
  }

  static let maxRetryAttempts = 3

  // MARK: - Performance Configuration

  static let maxItineraryLoadBatch = 20  // Load itineraries in batches of 20
  static let mapAnnotationLimit = 100  // Maximum annotations to show on map at once
  static let poiRenderBatchSize = 10  // Render POIs in batches of 10
  static let memoryWarningThreshold = 150 * 1024 * 1024  // 150 MB - trigger cleanup

  // MARK: - Offline Maps Configuration

  /// Maximum storage to use for offline maps (in bytes)
  static let offlineMapStorageLimit: Int64 = 2 * 1024 * 1024 * 1024  // 2 GB

  /// Minimum zoom level for offline map downloads
  static let offlineMapMinZoom = 10

  /// Maximum zoom level for offline map downloads
  static let offlineMapMaxZoom = 16

  /// Number of concurrent tile downloads
  static let offlineMapConcurrentDownloads = 4

  /// Delay between download batches (milliseconds) to avoid rate limiting
  static let offlineMapBatchDelayMs: UInt64 = 100

  // MARK: - App Info

  static var appVersion: String {
    Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
  }

  static var buildNumber: String {
    Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
  }

  static var fullVersionString: String {
    "\(appVersion) (\(buildNumber))"
  }

  // MARK: - Debug Helpers

  static func printConfiguration() {
    guard isDebugLoggingEnabled else { return }
    print("""
      ╔════════════════════════════════════════╗
      ║        Pathfinding Configuration       ║
      ╠════════════════════════════════════════╣
      ║ Environment: \(Environment.current.rawValue.padding(toLength: 20, withPad: " ", startingAt: 0)) ║
      ║ API URL: \(apiBaseURL.prefix(28).padding(toLength: 28, withPad: " ", startingAt: 0)) ║
      ║ Version: \(fullVersionString.padding(toLength: 28, withPad: " ", startingAt: 0)) ║
      ║ Debug Logging: \(isDebugLoggingEnabled ? "Enabled " : "Disabled")                  ║
      ║ Network Logging: \(isNetworkLoggingEnabled ? "Enabled " : "Disabled")                ║
      ╚════════════════════════════════════════╝
      """)
  }
}
