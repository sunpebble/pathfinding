import CoreLocation
import Foundation
import Observation

/// Manages offline map downloads and region state
@MainActor
@Observable
final class OfflineMapManager {
  // MARK: - Singleton

  static let shared = OfflineMapManager()

  // MARK: - Properties

  /// All available regions with their current download state
  private(set) var regions: [OfflineMapRegion] = []

  /// Currently active downloads
  private(set) var activeDownloads: [String: OfflineMapDownloadTask] = [:]

  /// Total storage used by offline maps
  private(set) var totalStorageUsed: Int64 = 0

  /// Available storage space
  private(set) var availableStorage: Int64 = 0

  /// Whether the manager is loading
  private(set) var isLoading: Bool = true

  /// Error message if any
  private(set) var errorMessage: String?

  // MARK: - Private Properties

  private let storage = OfflineMapStorage.shared
  private let userDefaults = UserDefaults.standard
  private let regionsKey = "offlineMapRegions"

  /// Tile server URL template (using OpenStreetMap)
  /// Note: For production, consider using your own tile server or a commercial provider
  private let tileServerURLTemplate = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

  // MARK: - Initialization

  private init() {
    loadRegions()
  }

  // MARK: - Public Methods

  /// Load regions from storage and update their states
  func loadRegions() {
    isLoading = true
    errorMessage = nil

    // Start with predefined cities
    var loadedRegions = OfflineMapRegion.popularCities

    // Load saved region states
    if let data = userDefaults.data(forKey: regionsKey),
       let savedRegions = try? JSONDecoder().decode([OfflineMapRegion].self, from: data) {
      // Merge saved states with predefined regions
      for (index, region) in loadedRegions.enumerated() {
        if let saved = savedRegions.first(where: { $0.id == region.id }) {
          loadedRegions[index] = saved
        }
      }
    }

    // Check actual download state from storage
    let downloadedIds = storage.getDownloadedRegionIds()
    for (index, region) in loadedRegions.enumerated() {
      if downloadedIds.contains(region.id) {
        loadedRegions[index].downloadState = .downloaded
        loadedRegions[index].downloadedBytes = storage.getDatabaseSize(regionId: region.id)
        loadedRegions[index].downloadedTiles = storage.getTileCount(regionId: region.id)
      } else if region.downloadState == .downloaded {
        // File was deleted externally
        loadedRegions[index].downloadState = .notDownloaded
        loadedRegions[index].downloadedBytes = 0
        loadedRegions[index].downloadedTiles = 0
      }
    }

    regions = loadedRegions
    updateStorageInfo()
    isLoading = false
  }

  /// Save region states to UserDefaults
  private func saveRegions() {
    if let data = try? JSONEncoder().encode(regions) {
      userDefaults.set(data, forKey: regionsKey)
    }
  }

  /// Update storage information
  func updateStorageInfo() {
    totalStorageUsed = storage.getTotalStorageUsed()
    availableStorage = storage.getAvailableStorage()
  }

  /// Get a region by ID
  func region(for id: String) -> OfflineMapRegion? {
    regions.first { $0.id == id }
  }

  /// Get downloaded regions
  var downloadedRegions: [OfflineMapRegion] {
    regions.filter { $0.isDownloaded }
  }

  /// Get regions grouped by province
  var regionsByProvince: [String: [OfflineMapRegion]] {
    Dictionary(grouping: regions, by: { $0.province ?? "其他" })
  }

  // MARK: - Download Management

  /// Start downloading a region
  func startDownload(regionId: String) async {
    guard let index = regions.firstIndex(where: { $0.id == regionId }) else {
      errorMessage = "Region not found"
      return
    }

    let region = regions[index]

    // Check if already downloading
    guard activeDownloads[regionId] == nil else {
      return
    }

    // Check available storage
    let estimatedSize = Int64(region.estimatedSizeMB * 1024 * 1024)
    if estimatedSize > availableStorage {
      errorMessage = "存储空间不足"
      return
    }

    // Create download task
    let task = OfflineMapDownloadTask(
      regionId: regionId,
      region: region,
      tileServerURLTemplate: tileServerURLTemplate,
      storage: storage
    )

    activeDownloads[regionId] = task

    // Update region state
    regions[index].downloadState = .downloading
    regions[index].totalTiles = OfflineMapStorage.totalTileCount(for: region)
    saveRegions()

    // Start download
    do {
      try await task.start { [weak self] progress, downloadedTiles in
        Task { @MainActor in
          guard let self = self,
                let idx = self.regions.firstIndex(where: { $0.id == regionId }) else { return }
          self.regions[idx].downloadedTiles = downloadedTiles
        }
      }

      // Download completed
      if let idx = regions.firstIndex(where: { $0.id == regionId }) {
        regions[idx].downloadState = .downloaded
        regions[idx].downloadedBytes = storage.getDatabaseSize(regionId: regionId)
        regions[idx].lastUpdated = Date()
      }
    } catch let error as OfflineMapDownloadTask.DownloadError {
      if let idx = regions.firstIndex(where: { $0.id == regionId }) {
        switch error {
        case .cancelled:
          regions[idx].downloadState = .paused
        default:
          regions[idx].downloadState = .failed
          errorMessage = error.localizedDescription
        }
      }
    } catch {
      if let idx = regions.firstIndex(where: { $0.id == regionId }) {
        regions[idx].downloadState = .failed
        errorMessage = error.localizedDescription
      }
    }

    activeDownloads.removeValue(forKey: regionId)
    saveRegions()
    updateStorageInfo()
  }

  /// Pause a download
  func pauseDownload(regionId: String) async {
    await activeDownloads[regionId]?.pause()

    if let index = regions.firstIndex(where: { $0.id == regionId }) {
      regions[index].downloadState = .paused
      saveRegions()
    }
  }

  /// Resume a paused download
  func resumeDownload(regionId: String) async {
    guard let index = regions.firstIndex(where: { $0.id == regionId }),
          regions[index].downloadState == .paused else {
      return
    }

    await startDownload(regionId: regionId)
  }

  /// Cancel a download
  func cancelDownload(regionId: String) async {
    await activeDownloads[regionId]?.cancel()
    activeDownloads.removeValue(forKey: regionId)

    // Delete partial download
    _ = storage.deleteRegion(regionId)

    if let index = regions.firstIndex(where: { $0.id == regionId }) {
      regions[index].downloadState = .notDownloaded
      regions[index].downloadedBytes = 0
      regions[index].downloadedTiles = 0
      saveRegions()
    }

    updateStorageInfo()
  }

  /// Delete a downloaded region
  func deleteRegion(regionId: String) async {
    // Cancel any active download first
    await cancelDownload(regionId: regionId)

    // Delete from storage
    _ = storage.deleteRegion(regionId)

    if let index = regions.firstIndex(where: { $0.id == regionId }) {
      regions[index].downloadState = .notDownloaded
      regions[index].downloadedBytes = 0
      regions[index].downloadedTiles = 0
      regions[index].lastUpdated = nil
      saveRegions()
    }

    updateStorageInfo()
  }

  /// Delete all downloaded regions
  func deleteAllRegions() async {
    // Cancel all active downloads
    for regionId in activeDownloads.keys {
      await cancelDownload(regionId: regionId)
    }

    // Delete all from storage
    _ = storage.deleteAllRegions()

    // Reset all regions
    for index in regions.indices {
      regions[index].downloadState = .notDownloaded
      regions[index].downloadedBytes = 0
      regions[index].downloadedTiles = 0
      regions[index].lastUpdated = nil
    }

    saveRegions()
    updateStorageInfo()
  }

  /// Update a downloaded region (re-download)
  func updateRegion(regionId: String) async {
    guard let index = regions.firstIndex(where: { $0.id == regionId }),
          regions[index].isDownloaded else {
      return
    }

    regions[index].downloadState = .updating
    saveRegions()

    // Delete and re-download
    _ = storage.deleteRegion(regionId)
    await startDownload(regionId: regionId)
  }

  // MARK: - Tile Access

  /// Get a tile for display (from offline storage)
  func getTile(regionId: String, zoom: Int, x: Int, y: Int) -> Data? {
    storage.getTile(regionId: regionId, zoom: zoom, x: x, y: y)
  }

  /// Check if a coordinate is covered by any downloaded region
  func isCoordinateCoveredOffline(latitude: Double, longitude: Double) -> OfflineMapRegion? {
    let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    return downloadedRegions.first { $0.boundingBox.contains(coordinate) }
  }

  /// Get downloaded region for a coordinate
  func getOfflineRegion(for coordinate: CLLocationCoordinate2D) -> OfflineMapRegion? {
    downloadedRegions.first { $0.boundingBox.contains(coordinate) }
  }
}

// MARK: - Storage Formatting

extension OfflineMapManager {
  var formattedTotalStorageUsed: String {
    ByteCountFormatter.string(fromByteCount: totalStorageUsed, countStyle: .file)
  }

  var formattedAvailableStorage: String {
    ByteCountFormatter.string(fromByteCount: availableStorage, countStyle: .file)
  }
}
