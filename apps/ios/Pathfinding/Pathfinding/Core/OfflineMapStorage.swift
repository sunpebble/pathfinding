import Foundation
import CoreLocation

/// Manages file-based storage for offline map tiles
final class OfflineMapStorage: @unchecked Sendable {
  // MARK: - Singleton

  static let shared = OfflineMapStorage()

  // MARK: - Properties

  private let fileManager = FileManager.default
  private let rootDirectoryName = "OfflineMaps"

  private var rootURL: URL {
    let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
    return documentsURL.appendingPathComponent(rootDirectoryName)
  }

  // MARK: - Initialization

  private init() {
    createRootDirectory()
  }

  private func createRootDirectory() {
    if !fileManager.fileExists(atPath: rootURL.path) {
      try? fileManager.createDirectory(at: rootURL, withIntermediateDirectories: true)
    }
  }

  // MARK: - Public Methods

  /// Store a tile image
  func storeTile(regionId: String, zoom: Int, x: Int, y: Int, data: Data) -> Bool {
    let tileURL = getTileURL(regionId: regionId, zoom: zoom, x: x, y: y)

    do {
      // Create directory if needed
      let directoryURL = tileURL.deletingLastPathComponent()
      if !fileManager.fileExists(atPath: directoryURL.path) {
        try fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true)
      }

      try data.write(to: tileURL)
      return true
    } catch {
      print("[OfflineMapStorage] Failed to store tile: \(error)")
      return false
    }
  }

  /// Get a tile image
  func getTile(regionId: String, zoom: Int, x: Int, y: Int) -> Data? {
    let tileURL = getTileURL(regionId: regionId, zoom: zoom, x: x, y: y)
    return try? Data(contentsOf: tileURL)
  }

  /// Check if a tile exists
  func hasTile(regionId: String, zoom: Int, x: Int, y: Int) -> Bool {
    let tileURL = getTileURL(regionId: regionId, zoom: zoom, x: x, y: y)
    return fileManager.fileExists(atPath: tileURL.path)
  }

  /// Delete a region's data
  func deleteRegion(_ regionId: String) -> Bool {
    let regionURL = rootURL.appendingPathComponent(regionId)

    guard fileManager.fileExists(atPath: regionURL.path) else { return true }

    do {
      try fileManager.removeItem(at: regionURL)
      return true
    } catch {
      print("[OfflineMapStorage] Failed to delete region \(regionId): \(error)")
      return false
    }
  }

  /// Delete all offline map data
  func deleteAllRegions() -> Bool {
    do {
      if fileManager.fileExists(atPath: rootURL.path) {
        try fileManager.removeItem(at: rootURL)
      }
      createRootDirectory()
      return true
    } catch {
      print("[OfflineMapStorage] Failed to delete all regions: \(error)")
      return false
    }
  }

  /// Get list of downloaded region IDs
  func getDownloadedRegionIds() -> [String] {
    guard let contents = try? fileManager.contentsOfDirectory(at: rootURL, includingPropertiesForKeys: nil) else {
      return []
    }

    // Filter directories that look like region IDs (not hidden files)
    return contents
      .filter { $0.hasDirectoryPath && !$0.lastPathComponent.hasPrefix(".") }
      .map { $0.lastPathComponent }
  }

  /// Get total size of a region in bytes
  func getDatabaseSize(regionId: String) -> Int64 {
    let regionURL = rootURL.appendingPathComponent(regionId)
    return getDirectorySize(url: regionURL)
  }

  /// Get tile count for a region (approximate by counting files)
  /// Note: This can be slow for large regions, use sparingly
  func getTileCount(regionId: String) -> Int {
    let regionURL = rootURL.appendingPathComponent(regionId)
    guard let enumerator = fileManager.enumerator(at: regionURL, includingPropertiesForKeys: nil) else {
      return 0
    }

    var count = 0
    for case let fileURL as URL in enumerator {
      if fileURL.pathExtension == "png" {
        count += 1
      }
    }
    return count
  }

  /// Get total storage used by all offline maps
  func getTotalStorageUsed() -> Int64 {
    getDirectorySize(url: rootURL)
  }

  /// Get available device storage
  func getAvailableStorage() -> Int64 {
    do {
      let values = try rootURL.resourceValues(forKeys: [.volumeAvailableCapacityKey])
      return Int64(values.volumeAvailableCapacity ?? 0)
    } catch {
      return 0
    }
  }

  /// Set metadata for a region
  func setMetadata(regionId: String, key: String, value: String) {
    let metadataURL = rootURL.appendingPathComponent(regionId).appendingPathComponent("metadata.json")

    var metadata: [String: String] = [:]

    // Load existing
    if let data = try? Data(contentsOf: metadataURL),
       let existing = try? JSONDecoder().decode([String: String].self, from: data) {
      metadata = existing
    }

    // Update
    metadata[key] = value

    // Save
    if let data = try? JSONEncoder().encode(metadata) {
      try? data.write(to: metadataURL)
    }
  }

  // MARK: - Private Methods

  private func getTileURL(regionId: String, zoom: Int, x: Int, y: Int) -> URL {
    // Structure: OfflineMaps/{regionId}/{z}/{x}/{y}.png
    return rootURL
      .appendingPathComponent(regionId)
      .appendingPathComponent(String(zoom))
      .appendingPathComponent(String(x))
      .appendingPathComponent("\(y).png")
  }

  private func getDirectorySize(url: URL) -> Int64 {
    guard let enumerator = fileManager.enumerator(at: url, includingPropertiesForKeys: [.fileSizeKey]) else {
      return 0
    }

    var totalSize: Int64 = 0

    for case let fileURL as URL in enumerator {
      if let values = try? fileURL.resourceValues(forKeys: [.fileSizeKey]),
         let fileSize = values.fileSize {
        totalSize += Int64(fileSize)
      }
    }

    return totalSize
  }
}

// MARK: - Tile Math Static Helpers

extension OfflineMapStorage {
  struct TileCoordinate: Hashable {
    let x: Int
    let y: Int
  }

  /// Calculate tiles in a bounding box for a specific zoom level
  static func tilesInBoundingBox(_ box: OfflineMapRegion.BoundingBox, zoom: Int) -> [TileCoordinate] {
    let minTile = latLonToTile(lat: box.maxLat, lon: box.minLon, zoom: zoom)
    let maxTile = latLonToTile(lat: box.minLat, lon: box.maxLon, zoom: zoom)

    var tiles: [TileCoordinate] = []

    for x in minTile.x...maxTile.x {
      for y in minTile.y...maxTile.y {
        tiles.append(TileCoordinate(x: x, y: y))
      }
    }

    return tiles
  }

  /// Calculate total tile count for a region across all its zoom levels
  static func totalTileCount(for region: OfflineMapRegion) -> Int {
    var count = 0
    for zoom in region.minZoom...region.maxZoom {
      let tiles = tilesInBoundingBox(region.boundingBox, zoom: zoom)
      count += tiles.count
    }
    return count
  }

  /// Convert Lat/Lon to Tile Coordinate (Slippy Map / OSM standard)
  /// Returns (x, y)
  static func latLonToTile(lat: Double, lon: Double, zoom: Int) -> (x: Int, y: Int) {
    let n = pow(2.0, Double(zoom))
    let x = Int(n * (lon + 180.0) / 360.0)

    let latRad = lat * .pi / 180.0
    let y = Int(n * (1.0 - log(tan(latRad) + 1.0 / cos(latRad)) / .pi) / 2.0)

    return (x, y)
  }
}
