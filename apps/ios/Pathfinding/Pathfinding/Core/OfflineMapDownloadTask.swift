import Foundation

/// Handles the actual download of map tiles for a region
actor OfflineMapDownloadTask {
  // MARK: - Types

  enum DownloadError: LocalizedError {
    case cancelled
    case networkError(Error)
    case storageError(String)
    case invalidResponse
    case rateLimited

    var errorDescription: String? {
      switch self {
      case .cancelled:
        return "下载已取消"
      case .networkError(let error):
        return "网络错误: \(error.localizedDescription)"
      case .storageError(let message):
        return "存储错误: \(message)"
      case .invalidResponse:
        return "服务器响应无效"
      case .rateLimited:
        return "请求过于频繁，请稍后重试"
      }
    }
  }

  enum State: Equatable {
    case idle
    case downloading
    case paused
    case completed
    case failed(String)
    case cancelled
  }

  // MARK: - Properties

  let regionId: String
  let region: OfflineMapRegion
  let tileServerURLTemplate: String
  let storage: OfflineMapStorage

  private(set) var state: State = .idle
  private(set) var downloadedTiles: Int = 0
  private(set) var totalTiles: Int = 0
  private(set) var downloadedBytes: Int64 = 0

  private var isPaused: Bool = false
  private var isCancelled: Bool = false

  /// Concurrent download limit
  private let maxConcurrentDownloads = 4

  /// Delay between batches to avoid rate limiting
  private let batchDelayMs: UInt64 = 100

  /// URLSession for downloads
  private lazy var session: URLSession = {
    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 30
    config.timeoutIntervalForResource = 60
    config.httpMaximumConnectionsPerHost = maxConcurrentDownloads
    config.requestCachePolicy = .reloadIgnoringLocalCacheData
    return URLSession(configuration: config)
  }()

  // MARK: - Initialization

  init(
    regionId: String,
    region: OfflineMapRegion,
    tileServerURLTemplate: String,
    storage: OfflineMapStorage
  ) {
    self.regionId = regionId
    self.region = region
    self.tileServerURLTemplate = tileServerURLTemplate
    self.storage = storage
  }

  // MARK: - Public Methods

  /// Start the download
  func start(progressHandler: @escaping @Sendable (Double, Int) async -> Void) async throws {
    guard state == .idle || state == .paused else { return }

    state = .downloading
    isPaused = false
    isCancelled = false

    // Calculate all tiles to download
    var allTiles: [(zoom: Int, x: Int, y: Int)] = []
    for zoom in region.minZoom...region.maxZoom {
      let tiles = OfflineMapStorage.tilesInBoundingBox(region.boundingBox, zoom: zoom)
      for tile in tiles {
        allTiles.append((zoom: zoom, x: tile.x, y: tile.y))
      }
    }

    totalTiles = allTiles.count

    // Filter out already downloaded tiles
    let tilesToDownload = allTiles.filter { tile in
      !storage.hasTile(regionId: regionId, zoom: tile.zoom, x: tile.x, y: tile.y)
    }

    // Update downloaded count based on existing tiles
    downloadedTiles = allTiles.count - tilesToDownload.count

    // Set metadata
    storage.setMetadata(regionId: regionId, key: "name", value: region.name)
    storage.setMetadata(regionId: regionId, key: "minzoom", value: String(region.minZoom))
    storage.setMetadata(regionId: regionId, key: "maxzoom", value: String(region.maxZoom))
    storage.setMetadata(regionId: regionId, key: "format", value: "png")

    // Download tiles in batches
    let batches = tilesToDownload.chunked(into: maxConcurrentDownloads)

    for batch in batches {
      // Check for pause/cancel
      if isCancelled {
        state = .cancelled
        throw DownloadError.cancelled
      }

      if isPaused {
        state = .paused
        throw DownloadError.cancelled
      }

      // Download batch concurrently
      try await withThrowingTaskGroup(of: (Bool, Int64).self) { group in
        for tile in batch {
          group.addTask { [self] in
            try await downloadTile(zoom: tile.zoom, x: tile.x, y: tile.y)
          }
        }

        for try await (success, bytes) in group {
          if success {
            downloadedTiles += 1
            downloadedBytes += bytes

            let progress = Double(downloadedTiles) / Double(totalTiles)
            await progressHandler(progress, downloadedTiles)
          }
        }
      }

      // Small delay between batches to avoid rate limiting
      try await Task.sleep(nanoseconds: batchDelayMs * 1_000_000)
    }

    state = .completed
  }

  /// Pause the download
  func pause() {
    isPaused = true
  }

  /// Cancel the download
  func cancel() {
    isCancelled = true
  }

  // MARK: - Private Methods

  /// Download a single tile
  private func downloadTile(zoom: Int, x: Int, y: Int) async throws -> (Bool, Int64) {
    let urlString = tileServerURLTemplate
      .replacingOccurrences(of: "{z}", with: String(zoom))
      .replacingOccurrences(of: "{x}", with: String(x))
      .replacingOccurrences(of: "{y}", with: String(y))

    guard let url = URL(string: urlString) else {
      return (false, 0)
    }

    var request = URLRequest(url: url)
    request.setValue("Pathfinding-iOS/1.0", forHTTPHeaderField: "User-Agent")

    do {
      let (data, response) = try await session.data(for: request)

      guard let httpResponse = response as? HTTPURLResponse else {
        throw DownloadError.invalidResponse
      }

      switch httpResponse.statusCode {
      case 200:
        let success = storage.storeTile(regionId: regionId, zoom: zoom, x: x, y: y, data: data)
        return (success, Int64(data.count))

      case 429:
        // Rate limited - wait and retry
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        return try await downloadTile(zoom: zoom, x: x, y: y)

      case 404:
        // Tile doesn't exist at this location - skip
        return (true, 0)

      default:
        if AppConfig.isDebugLoggingEnabled {
          print("[OfflineMapDownloadTask] HTTP \(httpResponse.statusCode) for tile z\(zoom)/\(x)/\(y)")
        }
        return (false, 0)
      }
    } catch {
      if AppConfig.isDebugLoggingEnabled {
        print("[OfflineMapDownloadTask] Failed to download tile z\(zoom)/\(x)/\(y): \(error)")
      }
      // Don't throw for individual tile failures, just skip
      return (false, 0)
    }
  }

  /// Get current progress
  var progress: Double {
    guard totalTiles > 0 else { return 0 }
    return Double(downloadedTiles) / Double(totalTiles)
  }
}

// MARK: - Array Extension

private extension Array {
  /// Split array into chunks of specified size
  func chunked(into size: Int) -> [[Element]] {
    stride(from: 0, to: count, by: size).map {
      Array(self[$0..<Swift.min($0 + size, count)])
    }
  }
}
