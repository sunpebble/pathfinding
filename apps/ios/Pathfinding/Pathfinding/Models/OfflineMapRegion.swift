import Foundation
import CoreLocation

/// Represents a downloadable offline map region (city/area)
struct OfflineMapRegion: Identifiable, Codable, Hashable {
  let id: String
  let name: String
  let localizedName: String
  let center: Coordinate
  let boundingBox: BoundingBox
  let estimatedSizeMB: Double
  let minZoom: Int
  let maxZoom: Int
  let country: String
  let province: String?

  /// Current download state
  var downloadState: DownloadState

  /// Last update timestamp
  var lastUpdated: Date?

  /// Actual downloaded size in bytes
  var downloadedBytes: Int64

  /// Total tiles to download
  var totalTiles: Int

  /// Downloaded tiles count
  var downloadedTiles: Int

  // MARK: - Nested Types

  struct Coordinate: Codable, Hashable {
    let latitude: Double
    let longitude: Double

    var clLocationCoordinate: CLLocationCoordinate2D {
      CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
  }

  struct BoundingBox: Codable, Hashable {
    let minLat: Double
    let minLon: Double
    let maxLat: Double
    let maxLon: Double

    /// Check if a coordinate is within this bounding box
    func contains(_ coordinate: CLLocationCoordinate2D) -> Bool {
      coordinate.latitude >= minLat &&
      coordinate.latitude <= maxLat &&
      coordinate.longitude >= minLon &&
      coordinate.longitude <= maxLon
    }
  }

  enum DownloadState: String, Codable {
    case notDownloaded
    case downloading
    case paused
    case downloaded
    case failed
    case updating
  }

  // MARK: - Computed Properties

  var downloadProgress: Double {
    guard totalTiles > 0 else { return 0 }
    return Double(downloadedTiles) / Double(totalTiles)
  }

  var formattedSize: String {
    if downloadedBytes > 0 {
      return ByteCountFormatter.string(fromByteCount: downloadedBytes, countStyle: .file)
    }
    return String(format: "%.1f MB", estimatedSizeMB)
  }

  var isDownloaded: Bool {
    downloadState == .downloaded
  }

  var isDownloading: Bool {
    downloadState == .downloading
  }

  // MARK: - Initialization

  init(
    id: String,
    name: String,
    localizedName: String,
    center: Coordinate,
    boundingBox: BoundingBox,
    estimatedSizeMB: Double,
    minZoom: Int = 10,
    maxZoom: Int = 16,
    country: String = "CN",
    province: String? = nil,
    downloadState: DownloadState = .notDownloaded,
    lastUpdated: Date? = nil,
    downloadedBytes: Int64 = 0,
    totalTiles: Int = 0,
    downloadedTiles: Int = 0
  ) {
    self.id = id
    self.name = name
    self.localizedName = localizedName
    self.center = center
    self.boundingBox = boundingBox
    self.estimatedSizeMB = estimatedSizeMB
    self.minZoom = minZoom
    self.maxZoom = maxZoom
    self.country = country
    self.province = province
    self.downloadState = downloadState
    self.lastUpdated = lastUpdated
    self.downloadedBytes = downloadedBytes
    self.totalTiles = totalTiles
    self.downloadedTiles = downloadedTiles
  }

  // MARK: - Hashable

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: OfflineMapRegion, rhs: OfflineMapRegion) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Predefined Regions

extension OfflineMapRegion {
  /// Popular Chinese cities for offline maps
  static let popularCities: [OfflineMapRegion] = [
    // Direct-controlled municipalities
    OfflineMapRegion(
      id: "beijing",
      name: "Beijing",
      localizedName: "北京",
      center: Coordinate(latitude: 39.9042, longitude: 116.4074),
      boundingBox: BoundingBox(minLat: 39.4, minLon: 115.4, maxLat: 40.4, maxLon: 117.4),
      estimatedSizeMB: 180,
      province: "北京市"
    ),
    OfflineMapRegion(
      id: "shanghai",
      name: "Shanghai",
      localizedName: "上海",
      center: Coordinate(latitude: 31.2304, longitude: 121.4737),
      boundingBox: BoundingBox(minLat: 30.7, minLon: 120.8, maxLat: 31.9, maxLon: 122.2),
      estimatedSizeMB: 150,
      province: "上海市"
    ),
    OfflineMapRegion(
      id: "chongqing",
      name: "Chongqing",
      localizedName: "重庆",
      center: Coordinate(latitude: 29.4316, longitude: 106.9123),
      boundingBox: BoundingBox(minLat: 28.1, minLon: 105.2, maxLat: 32.2, maxLon: 110.2),
      estimatedSizeMB: 280,
      province: "重庆市"
    ),
    OfflineMapRegion(
      id: "tianjin",
      name: "Tianjin",
      localizedName: "天津",
      center: Coordinate(latitude: 39.3434, longitude: 117.3616),
      boundingBox: BoundingBox(minLat: 38.5, minLon: 116.7, maxLat: 40.3, maxLon: 118.1),
      estimatedSizeMB: 120,
      province: "天津市"
    ),

    // Popular tourist cities
    OfflineMapRegion(
      id: "hangzhou",
      name: "Hangzhou",
      localizedName: "杭州",
      center: Coordinate(latitude: 30.2741, longitude: 120.1551),
      boundingBox: BoundingBox(minLat: 29.2, minLon: 118.3, maxLat: 30.6, maxLon: 120.8),
      estimatedSizeMB: 160,
      province: "浙江省"
    ),
    OfflineMapRegion(
      id: "suzhou",
      name: "Suzhou",
      localizedName: "苏州",
      center: Coordinate(latitude: 31.2990, longitude: 120.5853),
      boundingBox: BoundingBox(minLat: 30.8, minLon: 119.9, maxLat: 32.0, maxLon: 121.2),
      estimatedSizeMB: 130,
      province: "江苏省"
    ),
    OfflineMapRegion(
      id: "nanjing",
      name: "Nanjing",
      localizedName: "南京",
      center: Coordinate(latitude: 32.0603, longitude: 118.7969),
      boundingBox: BoundingBox(minLat: 31.2, minLon: 118.2, maxLat: 32.6, maxLon: 119.3),
      estimatedSizeMB: 140,
      province: "江苏省"
    ),
    OfflineMapRegion(
      id: "xian",
      name: "Xi'an",
      localizedName: "西安",
      center: Coordinate(latitude: 34.3416, longitude: 108.9398),
      boundingBox: BoundingBox(minLat: 33.4, minLon: 107.4, maxLat: 34.8, maxLon: 110.0),
      estimatedSizeMB: 145,
      province: "陕西省"
    ),
    OfflineMapRegion(
      id: "chengdu",
      name: "Chengdu",
      localizedName: "成都",
      center: Coordinate(latitude: 30.5728, longitude: 104.0668),
      boundingBox: BoundingBox(minLat: 30.0, minLon: 102.9, maxLat: 31.5, maxLon: 105.0),
      estimatedSizeMB: 165,
      province: "四川省"
    ),
    OfflineMapRegion(
      id: "guangzhou",
      name: "Guangzhou",
      localizedName: "广州",
      center: Coordinate(latitude: 23.1291, longitude: 113.2644),
      boundingBox: BoundingBox(minLat: 22.5, minLon: 112.9, maxLat: 23.9, maxLon: 114.1),
      estimatedSizeMB: 155,
      province: "广东省"
    ),
    OfflineMapRegion(
      id: "shenzhen",
      name: "Shenzhen",
      localizedName: "深圳",
      center: Coordinate(latitude: 22.5431, longitude: 114.0579),
      boundingBox: BoundingBox(minLat: 22.4, minLon: 113.7, maxLat: 22.9, maxLon: 114.7),
      estimatedSizeMB: 95,
      province: "广东省"
    ),
    OfflineMapRegion(
      id: "guilin",
      name: "Guilin",
      localizedName: "桂林",
      center: Coordinate(latitude: 25.2744, longitude: 110.2990),
      boundingBox: BoundingBox(minLat: 24.4, minLon: 109.4, maxLat: 26.2, maxLon: 111.6),
      estimatedSizeMB: 110,
      province: "广西壮族自治区"
    ),
    OfflineMapRegion(
      id: "lijiang",
      name: "Lijiang",
      localizedName: "丽江",
      center: Coordinate(latitude: 26.8721, longitude: 100.2299),
      boundingBox: BoundingBox(minLat: 25.8, minLon: 99.2, maxLat: 27.9, maxLon: 101.2),
      estimatedSizeMB: 85,
      province: "云南省"
    ),
    OfflineMapRegion(
      id: "kunming",
      name: "Kunming",
      localizedName: "昆明",
      center: Coordinate(latitude: 25.0389, longitude: 102.7183),
      boundingBox: BoundingBox(minLat: 24.2, minLon: 102.0, maxLat: 26.2, maxLon: 103.6),
      estimatedSizeMB: 125,
      province: "云南省"
    ),
    OfflineMapRegion(
      id: "lhasa",
      name: "Lhasa",
      localizedName: "拉萨",
      center: Coordinate(latitude: 29.6500, longitude: 91.1000),
      boundingBox: BoundingBox(minLat: 29.0, minLon: 90.0, maxLat: 30.3, maxLon: 92.2),
      estimatedSizeMB: 65,
      province: "西藏自治区"
    ),
    OfflineMapRegion(
      id: "xiamen",
      name: "Xiamen",
      localizedName: "厦门",
      center: Coordinate(latitude: 24.4798, longitude: 118.0894),
      boundingBox: BoundingBox(minLat: 24.3, minLon: 117.8, maxLat: 24.8, maxLon: 118.5),
      estimatedSizeMB: 75,
      province: "福建省"
    ),
    OfflineMapRegion(
      id: "qingdao",
      name: "Qingdao",
      localizedName: "青岛",
      center: Coordinate(latitude: 36.0671, longitude: 120.3826),
      boundingBox: BoundingBox(minLat: 35.4, minLon: 119.3, maxLat: 37.0, maxLon: 121.2),
      estimatedSizeMB: 135,
      province: "山东省"
    ),
    OfflineMapRegion(
      id: "sanya",
      name: "Sanya",
      localizedName: "三亚",
      center: Coordinate(latitude: 18.2528, longitude: 109.5117),
      boundingBox: BoundingBox(minLat: 18.0, minLon: 109.0, maxLat: 18.7, maxLon: 110.0),
      estimatedSizeMB: 55,
      province: "海南省"
    ),
    OfflineMapRegion(
      id: "harbin",
      name: "Harbin",
      localizedName: "哈尔滨",
      center: Coordinate(latitude: 45.8038, longitude: 126.5350),
      boundingBox: BoundingBox(minLat: 44.0, minLon: 125.4, maxLat: 46.6, maxLon: 130.2),
      estimatedSizeMB: 175,
      province: "黑龙江省"
    ),
    OfflineMapRegion(
      id: "zhangjiajie",
      name: "Zhangjiajie",
      localizedName: "张家界",
      center: Coordinate(latitude: 29.1169, longitude: 110.4789),
      boundingBox: BoundingBox(minLat: 28.5, minLon: 109.4, maxLat: 29.8, maxLon: 111.4),
      estimatedSizeMB: 70,
      province: "湖南省"
    ),
  ]

  /// Group regions by province
  static var regionsByProvince: [String: [OfflineMapRegion]] {
    Dictionary(grouping: popularCities, by: { $0.province ?? "其他" })
  }
}
