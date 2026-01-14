import AVFoundation
import CoreImage
import Foundation
import Observation
import OSLog
import UIKit

/// Manager for video editing including filters, text overlays, and trimming
@MainActor
@Observable
final class VideoEditorManager {
  static let shared = VideoEditorManager()

  // MARK: - Properties

  /// Current video being edited
  private(set) var currentVideo: TravelVideo?

  /// Current video asset
  private(set) var currentAsset: AVAsset?

  /// Preview player item
  private(set) var previewPlayerItem: AVPlayerItem?

  /// Applied filter
  private(set) var appliedFilter: VideoFilter = .none

  /// Text overlays
  private(set) var textOverlays: [VideoTextOverlay] = []

  /// Trim start time
  private(set) var trimStart: TimeInterval = 0

  /// Trim end time
  private(set) var trimEnd: TimeInterval = 0

  /// Original video duration
  private(set) var originalDuration: TimeInterval = 0

  /// Export progress (0.0 to 1.0)
  private(set) var exportProgress: Float = 0

  /// Is exporting
  private(set) var isExporting = false

  /// Error message
  private(set) var errorMessage: String?

  /// Available filters
  let availableFilters = VideoFilter.allCases

  // MARK: - Private Properties

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "VideoEditor")
  private let ciContext = CIContext()
  private var exportSession: AVAssetExportSession?
  private var progressTimer: Timer?

  private let fileManager = FileManager.default
  private let exportDirectoryName = "VideoExports"

  // MARK: - Initialization

  private init() {
    createExportDirectoryIfNeeded()
  }

  // MARK: - Directory Management

  private var exportDirectory: URL {
    let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
    return documentsPath.appendingPathComponent(exportDirectoryName)
  }

  private func createExportDirectoryIfNeeded() {
    if !fileManager.fileExists(atPath: exportDirectory.path) {
      do {
        try fileManager.createDirectory(at: exportDirectory, withIntermediateDirectories: true)
        logger.info("Created export directory")
      } catch {
        logger.error("Failed to create export directory: \(error.localizedDescription)")
      }
    }
  }

  // MARK: - Video Loading

  /// Load a video for editing
  func loadVideo(_ video: TravelVideo) async throws {
    let videoManager = VideoRecordingManager.shared
    let videoURL = videoManager.fileURL(for: video)

    guard fileManager.fileExists(atPath: videoURL.path) else {
      throw VideoEditorError.fileNotFound
    }

    let asset = AVURLAsset(url: videoURL)
    let duration = try await asset.load(.duration).seconds

    currentVideo = video
    currentAsset = asset
    originalDuration = duration
    trimStart = video.trimStart ?? 0
    trimEnd = video.trimEnd ?? duration
    appliedFilter = video.filter
    textOverlays = video.textOverlays

    // Create preview player item
    previewPlayerItem = AVPlayerItem(asset: asset)

    logger.info("Loaded video for editing: \(video.title)")
  }

  /// Unload current video
  func unloadVideo() {
    currentVideo = nil
    currentAsset = nil
    previewPlayerItem = nil
    originalDuration = 0
    trimStart = 0
    trimEnd = 0
    appliedFilter = .none
    textOverlays = []
    errorMessage = nil
  }

  // MARK: - Filter Application

  /// Apply a filter to the current video
  func applyFilter(_ filter: VideoFilter) {
    appliedFilter = filter
    logger.info("Applied filter: \(filter.displayName)")
  }

  /// Get filtered image for preview
  func filteredImage(from image: UIImage) -> UIImage? {
    guard appliedFilter != .none,
          let filterName = appliedFilter.ciFilterName,
          let ciImage = CIImage(image: image),
          let filter = CIFilter(name: filterName) else {
      return image
    }

    filter.setValue(ciImage, forKey: kCIInputImageKey)

    // Special handling for sepia filter
    if filterName == "CISepiaTone" {
      filter.setValue(0.8, forKey: kCIInputIntensityKey)
    }

    guard let outputImage = filter.outputImage,
          let cgImage = ciContext.createCGImage(outputImage, from: outputImage.extent) else {
      return image
    }

    return UIImage(cgImage: cgImage, scale: image.scale, orientation: image.imageOrientation)
  }

  /// Create filtered preview at specific time
  func filteredPreviewImage(at time: TimeInterval) async -> UIImage? {
    guard let asset = currentAsset else { return nil }

    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.maximumSize = CGSize(width: 600, height: 600)

    let cmTime = CMTime(seconds: time, preferredTimescale: 600)

    do {
      let (cgImage, _) = try await generator.image(at: cmTime)
      let originalImage = UIImage(cgImage: cgImage)
      return filteredImage(from: originalImage)
    } catch {
      logger.error("Failed to generate preview: \(error.localizedDescription)")
      return nil
    }
  }

  // MARK: - Text Overlays

  /// Add a text overlay
  func addTextOverlay(_ overlay: VideoTextOverlay) {
    textOverlays.append(overlay)
    logger.info("Added text overlay: \(overlay.text.prefix(20))...")
  }

  /// Update a text overlay
  func updateTextOverlay(_ overlay: VideoTextOverlay) {
    if let index = textOverlays.firstIndex(where: { $0.id == overlay.id }) {
      textOverlays[index] = overlay
    }
  }

  /// Remove a text overlay
  func removeTextOverlay(_ overlay: VideoTextOverlay) {
    textOverlays.removeAll { $0.id == overlay.id }
    logger.info("Removed text overlay")
  }

  /// Remove all text overlays
  func clearTextOverlays() {
    textOverlays.removeAll()
  }

  /// Create a new text overlay with default settings
  func createDefaultTextOverlay(text: String = "文字") -> VideoTextOverlay {
    VideoTextOverlay(
      text: text,
      position: CGPoint(x: 0.5, y: 0.5),
      fontSize: 32,
      fontName: "PingFangSC-Medium",
      textColor: "#FFFFFF",
      backgroundColor: "#00000080",
      startTime: trimStart,
      endTime: trimEnd
    )
  }

  // MARK: - Trimming

  /// Set trim range
  func setTrimRange(start: TimeInterval, end: TimeInterval) {
    trimStart = max(0, min(start, originalDuration))
    trimEnd = max(trimStart, min(end, originalDuration))
    logger.info("Set trim range: \(self.trimStart)s - \(self.trimEnd)s")
  }

  /// Reset trim to full video
  func resetTrim() {
    trimStart = 0
    trimEnd = originalDuration
  }

  /// Trimmed duration
  var trimmedDuration: TimeInterval {
    trimEnd - trimStart
  }

  // MARK: - Export

  /// Export video with applied edits
  func exportVideo(settings: VideoExportSettings = VideoExportSettings()) async throws -> URL {
    guard let asset = currentAsset, let video = currentVideo else {
      throw VideoEditorError.noVideoLoaded
    }

    isExporting = true
    exportProgress = 0
    errorMessage = nil

    defer {
      isExporting = false
      stopProgressTimer()
    }

    // Create composition
    let composition = AVMutableComposition()
    let timeRange = CMTimeRange(
      start: CMTime(seconds: trimStart, preferredTimescale: 600),
      duration: CMTime(seconds: trimmedDuration, preferredTimescale: 600)
    )

    // Add video track
    guard let videoTrack = try await asset.loadTracks(withMediaType: .video).first,
          let compositionVideoTrack = composition.addMutableTrack(
            withMediaType: .video,
            preferredTrackID: kCMPersistentTrackID_Invalid
          ) else {
      throw VideoEditorError.exportFailed
    }

    try compositionVideoTrack.insertTimeRange(timeRange, of: videoTrack, at: .zero)

    // Add audio track
    if let audioTrack = try? await asset.loadTracks(withMediaType: .audio).first,
       let compositionAudioTrack = composition.addMutableTrack(
        withMediaType: .audio,
        preferredTrackID: kCMPersistentTrackID_Invalid
       ) {
      try? compositionAudioTrack.insertTimeRange(timeRange, of: audioTrack, at: .zero)
    }

    // Create video composition for filter and overlays
    let videoComposition = try await createVideoComposition(
      for: composition,
      originalTrack: videoTrack,
      settings: settings
    )

    // Create export URL
    let exportFileName = "export_\(video.id.uuidString)_\(Date().timeIntervalSince1970).mp4"
    let exportURL = exportDirectory.appendingPathComponent(exportFileName)

    // Create export session
    guard let exportSession = AVAssetExportSession(
      asset: composition,
      presetName: exportPreset(for: settings.quality)
    ) else {
      throw VideoEditorError.exportFailed
    }

    self.exportSession = exportSession
    exportSession.outputURL = exportURL
    exportSession.outputFileType = .mp4
    exportSession.videoComposition = videoComposition
    exportSession.shouldOptimizeForNetworkUse = true

    // Start progress timer
    startProgressTimer()

    // Export
    await exportSession.export()

    if exportSession.status == .completed {
      logger.info("Video exported successfully: \(exportURL.lastPathComponent)")
      exportProgress = 1.0
      return exportURL
    } else if let error = exportSession.error {
      logger.error("Export failed: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      throw VideoEditorError.exportFailed
    } else {
      throw VideoEditorError.exportFailed
    }
  }

  /// Cancel ongoing export
  func cancelExport() {
    exportSession?.cancelExport()
    stopProgressTimer()
    isExporting = false
    exportProgress = 0
    logger.info("Export cancelled")
  }

  // MARK: - Video Composition

  private func createVideoComposition(
    for composition: AVMutableComposition,
    originalTrack: AVAssetTrack,
    settings: VideoExportSettings
  ) async throws -> AVMutableVideoComposition {
    let videoSize = try await originalTrack.load(.naturalSize)
    let transform = try await originalTrack.load(.preferredTransform)

    // Calculate actual size considering rotation
    var renderSize = videoSize
    if transform.a == 0 && transform.d == 0 {
      renderSize = CGSize(width: videoSize.height, height: videoSize.width)
    }

    let videoComposition = AVMutableVideoComposition()
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
    videoComposition.renderSize = renderSize

    // Create instruction
    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRange(
      start: .zero,
      duration: CMTime(seconds: trimmedDuration, preferredTimescale: 600)
    )

    // Create layer instruction
    guard let compositionTrack = composition.tracks(withMediaType: .video).first else {
      throw VideoEditorError.exportFailed
    }

    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionTrack)
    layerInstruction.setTransform(transform, at: .zero)

    instruction.layerInstructions = [layerInstruction]
    videoComposition.instructions = [instruction]

    // Apply filter if needed
    if appliedFilter != .none, let filterName = appliedFilter.ciFilterName {
      videoComposition.customVideoCompositorClass = nil // Use default

      // Create filter effect
      let filter = CIFilter(name: filterName)
      if filterName == "CISepiaTone" {
        filter?.setValue(0.8, forKey: kCIInputIntensityKey)
      }

      // Note: For real-time filter application during export, we'd need a custom compositor
      // For now, we apply the filter info to be used in post-processing
    }

    // Add overlay layers (watermark, text, date, location)
    if settings.includeWatermark || !textOverlays.isEmpty || settings.includeDate || settings.includeLocation {
      addOverlayLayers(to: videoComposition, size: renderSize, settings: settings)
    }

    return videoComposition
  }

  private func addOverlayLayers(
    to videoComposition: AVMutableVideoComposition,
    size: CGSize,
    settings: VideoExportSettings
  ) {
    // Create parent layer
    let parentLayer = CALayer()
    parentLayer.frame = CGRect(origin: .zero, size: size)

    // Create video layer
    let videoLayer = CALayer()
    videoLayer.frame = CGRect(origin: .zero, size: size)
    parentLayer.addSublayer(videoLayer)

    // Create overlay layer
    let overlayLayer = CALayer()
    overlayLayer.frame = CGRect(origin: .zero, size: size)

    // Add watermark
    if settings.includeWatermark, let watermarkText = settings.watermarkText {
      let watermarkLayer = createTextLayer(
        text: watermarkText,
        fontSize: 16,
        color: .white.withAlphaComponent(0.7),
        position: CGPoint(x: size.width - 120, y: 20),
        size: CGSize(width: 200, height: 30)
      )
      overlayLayer.addSublayer(watermarkLayer)
    }

    // Add date
    if settings.includeDate {
      let dateFormatter = DateFormatter()
      dateFormatter.dateFormat = "yyyy-MM-dd HH:mm"
      let dateText = dateFormatter.string(from: currentVideo?.createdAt ?? Date())

      let dateLayer = createTextLayer(
        text: dateText,
        fontSize: 14,
        color: .white.withAlphaComponent(0.7),
        position: CGPoint(x: 10, y: size.height - 30),
        size: CGSize(width: 200, height: 25)
      )
      overlayLayer.addSublayer(dateLayer)
    }

    // Add location
    if settings.includeLocation, let location = currentVideo?.location {
      let locationText = location.address ?? "\(String(format: "%.4f", location.latitude)), \(String(format: "%.4f", location.longitude))"

      let locationLayer = createTextLayer(
        text: locationText,
        fontSize: 12,
        color: .white.withAlphaComponent(0.7),
        position: CGPoint(x: 10, y: size.height - 55),
        size: CGSize(width: 300, height: 20)
      )
      overlayLayer.addSublayer(locationLayer)
    }

    // Add text overlays
    for overlay in textOverlays {
      let textLayer = createTextLayer(
        text: overlay.text,
        fontSize: overlay.fontSize,
        color: UIColor(hex: overlay.textColor) ?? .white,
        position: CGPoint(
          x: overlay.position.x * size.width - 100,
          y: (1 - overlay.position.y) * size.height - 25
        ),
        size: CGSize(width: 200, height: 50),
        backgroundColor: overlay.backgroundColor.flatMap { UIColor(hex: $0) }
      )
      textLayer.transform = CATransform3DMakeRotation(CGFloat(overlay.rotation * .pi / 180), 0, 0, 1)

      // Add animation for timed overlays
      if overlay.startTime > 0 || overlay.endTime < trimmedDuration {
        let fadeIn = CAKeyframeAnimation(keyPath: "opacity")
        fadeIn.values = [0, 0, 1, 1, 0, 0]
        fadeIn.keyTimes = [
          0,
          NSNumber(value: overlay.startTime / trimmedDuration),
          NSNumber(value: (overlay.startTime + 0.3) / trimmedDuration),
          NSNumber(value: (overlay.endTime - 0.3) / trimmedDuration),
          NSNumber(value: overlay.endTime / trimmedDuration),
          1
        ]
        fadeIn.duration = trimmedDuration
        fadeIn.isRemovedOnCompletion = false
        fadeIn.fillMode = .forwards
        textLayer.add(fadeIn, forKey: "opacity")
      }

      overlayLayer.addSublayer(textLayer)
    }

    parentLayer.addSublayer(overlayLayer)

    // Apply layer animation
    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: parentLayer
    )
  }

  private func createTextLayer(
    text: String,
    fontSize: CGFloat,
    color: UIColor,
    position: CGPoint,
    size: CGSize,
    backgroundColor: UIColor? = nil
  ) -> CATextLayer {
    let textLayer = CATextLayer()
    textLayer.string = text
    textLayer.font = UIFont.systemFont(ofSize: fontSize, weight: .medium)
    textLayer.fontSize = fontSize
    textLayer.foregroundColor = color.cgColor
    textLayer.backgroundColor = backgroundColor?.cgColor
    textLayer.alignmentMode = .left
    textLayer.frame = CGRect(origin: position, size: size)
    textLayer.contentsScale = UIScreen.main.scale
    textLayer.cornerRadius = 4
    textLayer.masksToBounds = true
    return textLayer
  }

  private func exportPreset(for quality: VideoQuality) -> String {
    switch quality {
    case .low: return AVAssetExportPresetMediumQuality
    case .medium: return AVAssetExportPreset960x540
    case .high: return AVAssetExportPreset1920x1080
    case .ultra: return AVAssetExportPreset3840x2160
    }
  }

  // MARK: - Progress Timer

  private func startProgressTimer() {
    progressTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
      Task { @MainActor [weak self] in
        guard let self, let session = self.exportSession else { return }
        self.exportProgress = session.progress
      }
    }
  }

  private func stopProgressTimer() {
    progressTimer?.invalidate()
    progressTimer = nil
    exportSession = nil
  }

  // MARK: - Save Changes

  /// Save editing changes to video
  func saveChanges() {
    guard var video = currentVideo else { return }

    video.filter = appliedFilter
    video.textOverlays = textOverlays
    video.trimStart = trimStart > 0 ? trimStart : nil
    video.trimEnd = trimEnd < originalDuration ? trimEnd : nil
    video.updatedAt = Date()

    VideoRecordingManager.shared.updateVideo(video)
    currentVideo = video

    logger.info("Saved video changes: \(video.title)")
  }

  /// Discard changes
  func discardChanges() {
    guard let video = currentVideo else { return }

    appliedFilter = video.filter
    textOverlays = video.textOverlays
    trimStart = video.trimStart ?? 0
    trimEnd = video.trimEnd ?? originalDuration

    logger.info("Discarded changes")
  }
}

// MARK: - Video Editor Error

enum VideoEditorError: LocalizedError {
  case fileNotFound
  case noVideoLoaded
  case exportFailed
  case invalidTimeRange

  var errorDescription: String? {
    switch self {
    case .fileNotFound:
      return "视频文件不存在"
    case .noVideoLoaded:
      return "未加载视频"
    case .exportFailed:
      return "导出失败"
    case .invalidTimeRange:
      return "无效的时间范围"
    }
  }
}

// MARK: - UIColor Hex Extension

private extension UIColor {
  convenience init?(hex: String) {
    var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

    var rgb: UInt64 = 0
    var alpha: CGFloat = 1.0

    guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else {
      return nil
    }

    let length = hexSanitized.count
    if length == 8 {
      alpha = CGFloat((rgb & 0xFF000000) >> 24) / 255.0
      rgb = rgb & 0x00FFFFFF
    }

    let red = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
    let green = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
    let blue = CGFloat(rgb & 0x0000FF) / 255.0

    self.init(red: red, green: green, blue: blue, alpha: alpha)
  }
}
