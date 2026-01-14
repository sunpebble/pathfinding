import Foundation
import Observation
import OSLog

/// Store for managing video albums/collections
@MainActor
@Observable
final class VideoAlbumStore {
  static let shared = VideoAlbumStore()

  // MARK: - Properties

  /// All video albums
  private(set) var albums: [VideoAlbum] = []

  /// Currently selected album
  private(set) var selectedAlbum: VideoAlbum?

  /// Error message
  private(set) var errorMessage: String?

  // MARK: - Private Properties

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "VideoAlbum")
  private let fileManager = FileManager.default
  private let albumsFileName = "video_albums.json"

  // MARK: - Initialization

  private init() {
    loadAlbums()
  }

  // MARK: - Directory Management

  private var albumsFileURL: URL {
    let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
    return documentsPath.appendingPathComponent(albumsFileName)
  }

  // MARK: - Album CRUD

  /// Create a new album
  @discardableResult
  func createAlbum(
    name: String,
    description: String? = nil,
    itineraryId: String? = nil
  ) -> VideoAlbum {
    let album = VideoAlbum(
      name: name,
      description: description,
      itineraryId: itineraryId
    )

    albums.insert(album, at: 0)
    saveAlbums()

    logger.info("Created album: \(name)")
    return album
  }

  /// Update an album
  func updateAlbum(_ album: VideoAlbum) {
    if let index = albums.firstIndex(where: { $0.id == album.id }) {
      var updatedAlbum = album
      updatedAlbum.updatedAt = Date()
      albums[index] = updatedAlbum
      saveAlbums()
      logger.info("Updated album: \(album.name)")
    }
  }

  /// Delete an album
  func deleteAlbum(_ album: VideoAlbum) {
    albums.removeAll { $0.id == album.id }
    saveAlbums()
    logger.info("Deleted album: \(album.name)")
  }

  /// Get album by ID
  func album(byId id: UUID) -> VideoAlbum? {
    albums.first { $0.id == id }
  }

  /// Select an album
  func selectAlbum(_ album: VideoAlbum?) {
    selectedAlbum = album
  }

  // MARK: - Video Management

  /// Add a video to an album
  func addVideo(_ video: TravelVideo, to album: VideoAlbum) {
    guard var updatedAlbum = albums.first(where: { $0.id == album.id }) else { return }

    if !updatedAlbum.videoIds.contains(video.id) {
      updatedAlbum.videoIds.append(video.id)
      updatedAlbum.updatedAt = Date()

      // Set cover if first video
      if updatedAlbum.coverVideoId == nil {
        updatedAlbum.coverVideoId = video.id
      }

      if let index = albums.firstIndex(where: { $0.id == album.id }) {
        albums[index] = updatedAlbum
        saveAlbums()
        logger.info("Added video to album: \(album.name)")
      }
    }
  }

  /// Add multiple videos to an album
  func addVideos(_ videos: [TravelVideo], to album: VideoAlbum) {
    guard var updatedAlbum = albums.first(where: { $0.id == album.id }) else { return }

    var added = false
    for video in videos {
      if !updatedAlbum.videoIds.contains(video.id) {
        updatedAlbum.videoIds.append(video.id)
        added = true
      }
    }

    if added {
      updatedAlbum.updatedAt = Date()

      // Set cover if none
      if updatedAlbum.coverVideoId == nil, let firstVideo = videos.first {
        updatedAlbum.coverVideoId = firstVideo.id
      }

      if let index = albums.firstIndex(where: { $0.id == album.id }) {
        albums[index] = updatedAlbum
        saveAlbums()
        logger.info("Added \(videos.count) videos to album: \(album.name)")
      }
    }
  }

  /// Remove a video from an album
  func removeVideo(_ video: TravelVideo, from album: VideoAlbum) {
    guard var updatedAlbum = albums.first(where: { $0.id == album.id }) else { return }

    updatedAlbum.videoIds.removeAll { $0 == video.id }
    updatedAlbum.updatedAt = Date()

    // Update cover if removed
    if updatedAlbum.coverVideoId == video.id {
      updatedAlbum.coverVideoId = updatedAlbum.videoIds.first
    }

    if let index = albums.firstIndex(where: { $0.id == album.id }) {
      albums[index] = updatedAlbum
      saveAlbums()
      logger.info("Removed video from album: \(album.name)")
    }
  }

  /// Set album cover
  func setCover(video: TravelVideo, for album: VideoAlbum) {
    guard var updatedAlbum = albums.first(where: { $0.id == album.id }) else { return }

    // Ensure video is in album
    if !updatedAlbum.videoIds.contains(video.id) {
      updatedAlbum.videoIds.append(video.id)
    }

    updatedAlbum.coverVideoId = video.id
    updatedAlbum.updatedAt = Date()

    if let index = albums.firstIndex(where: { $0.id == album.id }) {
      albums[index] = updatedAlbum
      saveAlbums()
      logger.info("Set cover for album: \(album.name)")
    }
  }

  /// Reorder videos in album
  func reorderVideos(in album: VideoAlbum, from sourceIndices: IndexSet, to destination: Int) {
    guard var updatedAlbum = albums.first(where: { $0.id == album.id }) else { return }

    updatedAlbum.videoIds.move(fromOffsets: sourceIndices, toOffset: destination)
    updatedAlbum.updatedAt = Date()

    if let index = albums.firstIndex(where: { $0.id == album.id }) {
      albums[index] = updatedAlbum
      saveAlbums()
    }
  }

  // MARK: - Query Methods

  /// Get all videos in an album
  func videos(in album: VideoAlbum) -> [TravelVideo] {
    let allVideos = VideoRecordingManager.shared.videos
    return album.videoIds.compactMap { videoId in
      allVideos.first { $0.id == videoId }
    }
  }

  /// Get albums containing a video
  func albums(containing video: TravelVideo) -> [VideoAlbum] {
    albums.filter { $0.videoIds.contains(video.id) }
  }

  /// Get albums for an itinerary
  func albums(forItinerary itineraryId: String) -> [VideoAlbum] {
    albums.filter { $0.itineraryId == itineraryId }
  }

  /// Get cover video for album
  func coverVideo(for album: VideoAlbum) -> TravelVideo? {
    guard let coverId = album.coverVideoId else { return nil }
    return VideoRecordingManager.shared.video(byId: coverId)
  }

  /// Get or create album for itinerary
  func getOrCreateAlbum(forItinerary itineraryId: String, name: String) -> VideoAlbum {
    if let existing = albums.first(where: { $0.itineraryId == itineraryId }) {
      return existing
    }
    return createAlbum(name: name, itineraryId: itineraryId)
  }

  // MARK: - Auto Album Creation

  /// Create auto albums based on video metadata
  func createAutoAlbums() {
    let allVideos = VideoRecordingManager.shared.videos

    // Create albums by category
    for category in VideoCategory.allCases {
      let categoryVideos = allVideos.filter { $0.category == category }
      if categoryVideos.count >= 3 {
        // Check if album already exists
        let albumName = category.displayName
        if !albums.contains(where: { $0.name == albumName && $0.itineraryId == nil }) {
          let album = createAlbum(name: albumName)
          addVideos(categoryVideos, to: album)
        }
      }
    }

    // Create albums by date (monthly)
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy年MM月"

    let groupedByMonth = Dictionary(grouping: allVideos) { video in
      dateFormatter.string(from: video.createdAt)
    }

    for (monthName, videos) in groupedByMonth where videos.count >= 3 {
      if !albums.contains(where: { $0.name == monthName }) {
        let album = createAlbum(name: monthName)
        addVideos(videos, to: album)
      }
    }

    logger.info("Auto albums created")
  }

  // MARK: - Statistics

  /// Total video count across all albums
  var totalVideoCount: Int {
    albums.reduce(0) { $0 + $1.videoCount }
  }

  /// Album with most videos
  var largestAlbum: VideoAlbum? {
    albums.max(by: { $0.videoCount < $1.videoCount })
  }

  // MARK: - Persistence

  private func loadAlbums() {
    guard let data = try? Data(contentsOf: albumsFileURL) else { return }

    do {
      albums = try JSONDecoder().decode([VideoAlbum].self, from: data)
      logger.info("Loaded \(self.albums.count) albums")
    } catch {
      logger.error("Failed to load albums: \(error.localizedDescription)")
    }
  }

  private func saveAlbums() {
    do {
      let data = try JSONEncoder().encode(albums)
      try data.write(to: albumsFileURL)
    } catch {
      logger.error("Failed to save albums: \(error.localizedDescription)")
    }
  }

  // MARK: - Cleanup

  /// Remove invalid video references (videos that no longer exist)
  func cleanupInvalidReferences() {
    let allVideoIds = Set(VideoRecordingManager.shared.videos.map { $0.id })
    var needsSave = false

    for i in albums.indices {
      let validIds = albums[i].videoIds.filter { allVideoIds.contains($0) }
      if validIds.count != albums[i].videoIds.count {
        albums[i].videoIds = validIds
        if let coverId = albums[i].coverVideoId, !allVideoIds.contains(coverId) {
          albums[i].coverVideoId = validIds.first
        }
        needsSave = true
      }
    }

    if needsSave {
      saveAlbums()
      logger.info("Cleaned up invalid video references")
    }
  }
}
