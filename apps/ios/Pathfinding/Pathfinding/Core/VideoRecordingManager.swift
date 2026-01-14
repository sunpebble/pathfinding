import AVFoundation
import CoreLocation
import Foundation
import Observation
import OSLog
import Photos
import UIKit

/// Manager for recording, processing, and storing travel videos
@MainActor
@Observable
final class VideoRecordingManager: NSObject {
  static let shared = VideoRecordingManager()

  // MARK: - Properties

  /// Current recording state
  private(set) var isRecording = false

  /// Camera preview layer
  private(set) var previewLayer: AVCaptureVideoPreviewLayer?

  /// Current recording duration in seconds
  private(set) var recordingDuration: TimeInterval = 0

  /// Maximum recording duration based on quality
  private(set) var maxDuration: TimeInterval = 120

  /// Current video quality
  var videoQuality: VideoQuality = .high {
    didSet {
      maxDuration = videoQuality.maxDuration
      if isSessionConfigured {
        Task {
          await reconfigureSession()
        }
      }
    }
  }

  /// Current camera position
  private(set) var cameraPosition: AVCaptureDevice.Position = .back

  /// Flash mode
  var flashMode: AVCaptureDevice.FlashMode = .off

  /// Torch mode for video
  var torchMode: AVCaptureDevice.TorchMode = .off {
    didSet {
      updateTorchMode()
    }
  }

  /// Zoom level (1.0 = no zoom)
  var zoomLevel: CGFloat = 1.0 {
    didSet {
      updateZoom()
    }
  }

  /// Minimum zoom level
  private(set) var minZoomLevel: CGFloat = 1.0

  /// Maximum zoom level
  private(set) var maxZoomLevel: CGFloat = 10.0

  /// Current video file URL
  private(set) var currentVideoURL: URL?

  /// Current thumbnail image
  private(set) var currentThumbnail: UIImage?

  /// Error message
  private(set) var errorMessage: String?

  /// All saved videos
  private(set) var videos: [TravelVideo] = []

  /// Camera authorization status
  private(set) var cameraAuthorizationStatus: AVAuthorizationStatus = .notDetermined

  /// Microphone authorization status
  private(set) var microphoneAuthorizationStatus: AVAuthorizationStatus = .notDetermined

  /// Location manager for geotagging
  private(set) var currentLocation: CLLocation?

  // MARK: - Private Properties

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "VideoRecording")
  private var captureSession: AVCaptureSession?
  private var videoOutput: AVCaptureMovieFileOutput?
  private var currentVideoInput: AVCaptureDeviceInput?
  private var audioInput: AVCaptureDeviceInput?
  private var recordingTimer: Timer?
  private var isSessionConfigured = false

  private let fileManager = FileManager.default
  private let videosDirectoryName = "TravelVideos"
  private let thumbnailsDirectoryName = "VideoThumbnails"
  private let videosListFileName = "videos.json"

  private let locationManager = CLLocationManager()

  // MARK: - Initialization

  override private init() {
    super.init()
    createDirectoriesIfNeeded()
    loadVideos()
    checkAuthorizations()
    setupLocationManager()
  }

  // MARK: - Directory Management

  private var videosDirectory: URL {
    let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
    return documentsPath.appendingPathComponent(videosDirectoryName)
  }

  private var thumbnailsDirectory: URL {
    let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
    return documentsPath.appendingPathComponent(thumbnailsDirectoryName)
  }

  private func createDirectoriesIfNeeded() {
    for directory in [videosDirectory, thumbnailsDirectory] {
      if !fileManager.fileExists(atPath: directory.path) {
        do {
          try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
          logger.info("Created directory: \(directory.lastPathComponent)")
        } catch {
          logger.error("Failed to create directory: \(error.localizedDescription)")
        }
      }
    }
  }

  // MARK: - Authorization

  private func checkAuthorizations() {
    cameraAuthorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)
    microphoneAuthorizationStatus = AVCaptureDevice.authorizationStatus(for: .audio)
  }

  func requestCameraAuthorization() async -> Bool {
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    if status == .authorized {
      cameraAuthorizationStatus = .authorized
      return true
    }

    if status == .notDetermined {
      let granted = await AVCaptureDevice.requestAccess(for: .video)
      cameraAuthorizationStatus = granted ? .authorized : .denied
      return granted
    }

    cameraAuthorizationStatus = status
    return false
  }

  func requestMicrophoneAuthorization() async -> Bool {
    let status = AVCaptureDevice.authorizationStatus(for: .audio)
    if status == .authorized {
      microphoneAuthorizationStatus = .authorized
      return true
    }

    if status == .notDetermined {
      let granted = await AVCaptureDevice.requestAccess(for: .audio)
      microphoneAuthorizationStatus = granted ? .authorized : .denied
      return granted
    }

    microphoneAuthorizationStatus = status
    return false
  }

  // MARK: - Location

  private func setupLocationManager() {
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyBest
  }

  func requestLocationAuthorization() {
    locationManager.requestWhenInUseAuthorization()
  }

  func startLocationUpdates() {
    locationManager.startUpdatingLocation()
  }

  func stopLocationUpdates() {
    locationManager.stopUpdatingLocation()
  }

  // MARK: - Camera Setup

  func setupCamera() async throws {
    guard await requestCameraAuthorization() else {
      throw VideoRecordingError.cameraNotAuthorized
    }

    guard await requestMicrophoneAuthorization() else {
      throw VideoRecordingError.microphoneNotAuthorized
    }

    let session = AVCaptureSession()
    session.beginConfiguration()

    // Set session preset based on quality
    session.sessionPreset = sessionPreset(for: videoQuality)

    // Add video input
    guard let videoDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: cameraPosition) else {
      throw VideoRecordingError.cameraNotAvailable
    }

    let videoInput = try AVCaptureDeviceInput(device: videoDevice)
    if session.canAddInput(videoInput) {
      session.addInput(videoInput)
      currentVideoInput = videoInput
      updateZoomLimits(for: videoDevice)
    } else {
      throw VideoRecordingError.configurationFailed
    }

    // Add audio input
    if let audioDevice = AVCaptureDevice.default(for: .audio) {
      let audioInput = try AVCaptureDeviceInput(device: audioDevice)
      if session.canAddInput(audioInput) {
        session.addInput(audioInput)
        self.audioInput = audioInput
      }
    }

    // Add movie file output
    let movieOutput = AVCaptureMovieFileOutput()
    if session.canAddOutput(movieOutput) {
      session.addOutput(movieOutput)
      videoOutput = movieOutput
    } else {
      throw VideoRecordingError.configurationFailed
    }

    session.commitConfiguration()
    captureSession = session

    // Create preview layer
    let preview = AVCaptureVideoPreviewLayer(session: session)
    preview.videoGravity = .resizeAspectFill
    previewLayer = preview

    isSessionConfigured = true
    logger.info("Camera setup completed")
  }

  func startSession() {
    guard let session = captureSession, !session.isRunning else { return }
    Task.detached { [weak self] in
      self?.captureSession?.startRunning()
      await MainActor.run {
        self?.logger.info("Camera session started")
      }
    }
  }

  func stopSession() {
    guard let session = captureSession, session.isRunning else { return }
    Task.detached { [weak self] in
      self?.captureSession?.stopRunning()
      await MainActor.run {
        self?.logger.info("Camera session stopped")
      }
    }
  }

  private func sessionPreset(for quality: VideoQuality) -> AVCaptureSession.Preset {
    switch quality {
    case .low: return .medium
    case .medium: return .high
    case .high: return .hd1920x1080
    case .ultra: return .hd4K3840x2160
    }
  }

  private func reconfigureSession() async {
    guard let session = captureSession else { return }

    session.beginConfiguration()
    session.sessionPreset = sessionPreset(for: videoQuality)
    session.commitConfiguration()
  }

  // MARK: - Camera Controls

  func switchCamera() async throws {
    guard let session = captureSession, let currentInput = currentVideoInput else {
      throw VideoRecordingError.configurationFailed
    }

    let newPosition: AVCaptureDevice.Position = cameraPosition == .back ? .front : .back

    guard let newDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: newPosition) else {
      throw VideoRecordingError.cameraNotAvailable
    }

    let newInput = try AVCaptureDeviceInput(device: newDevice)

    session.beginConfiguration()
    session.removeInput(currentInput)

    if session.canAddInput(newInput) {
      session.addInput(newInput)
      currentVideoInput = newInput
      cameraPosition = newPosition
      updateZoomLimits(for: newDevice)
      zoomLevel = 1.0
    } else {
      session.addInput(currentInput)
      throw VideoRecordingError.configurationFailed
    }

    session.commitConfiguration()
    logger.info("Switched to \(newPosition == .front ? "front" : "back") camera")
  }

  private func updateZoomLimits(for device: AVCaptureDevice) {
    minZoomLevel = device.minAvailableVideoZoomFactor
    maxZoomLevel = min(device.maxAvailableVideoZoomFactor, 10.0)
  }

  private func updateZoom() {
    guard let device = currentVideoInput?.device else { return }

    do {
      try device.lockForConfiguration()
      device.videoZoomFactor = max(minZoomLevel, min(zoomLevel, maxZoomLevel))
      device.unlockForConfiguration()
    } catch {
      logger.error("Failed to update zoom: \(error.localizedDescription)")
    }
  }

  private func updateTorchMode() {
    guard let device = currentVideoInput?.device, device.hasTorch else { return }

    do {
      try device.lockForConfiguration()
      if device.isTorchModeSupported(torchMode) {
        device.torchMode = torchMode
      }
      device.unlockForConfiguration()
    } catch {
      logger.error("Failed to update torch: \(error.localizedDescription)")
    }
  }

  func focus(at point: CGPoint, in view: UIView) {
    guard let device = currentVideoInput?.device else { return }
    guard let previewLayer = previewLayer else { return }

    let focusPoint = previewLayer.captureDevicePointConverted(fromLayerPoint: point)

    do {
      try device.lockForConfiguration()

      if device.isFocusPointOfInterestSupported {
        device.focusPointOfInterest = focusPoint
        device.focusMode = .autoFocus
      }

      if device.isExposurePointOfInterestSupported {
        device.exposurePointOfInterest = focusPoint
        device.exposureMode = .autoExpose
      }

      device.unlockForConfiguration()
    } catch {
      logger.error("Failed to focus: \(error.localizedDescription)")
    }
  }

  // MARK: - Recording

  func startRecording() throws {
    guard let output = videoOutput, !isRecording else {
      throw VideoRecordingError.recordingFailed
    }

    // Create video file URL
    let fileName = "video_\(Date().timeIntervalSince1970).mp4"
    let fileURL = videosDirectory.appendingPathComponent(fileName)
    currentVideoURL = fileURL

    // Set video orientation
    if let connection = output.connection(with: .video) {
      if connection.isVideoOrientationSupported {
        connection.videoOrientation = currentVideoOrientation()
      }
      if connection.isVideoMirroringSupported && cameraPosition == .front {
        connection.isVideoMirrored = true
      }
    }

    // Start recording
    output.startRecording(to: fileURL, recordingDelegate: self)
    isRecording = true
    recordingDuration = 0
    errorMessage = nil

    // Start recording timer
    startRecordingTimer()

    // Start location updates for geotagging
    startLocationUpdates()

    logger.info("Started recording to: \(fileName)")
  }

  func stopRecording() async -> TravelVideo? {
    guard isRecording, let output = videoOutput else {
      return nil
    }

    output.stopRecording()
    stopRecordingTimer()
    stopLocationUpdates()
    isRecording = false

    // Wait a moment for file to be finalized
    try? await Task.sleep(for: .milliseconds(500))

    guard let videoURL = currentVideoURL else {
      return nil
    }

    // Generate thumbnail
    let thumbnailFileName = await generateThumbnail(for: videoURL)

    // Get video metadata
    let asset = AVURLAsset(url: videoURL)
    let duration = try? await asset.load(.duration).seconds
    let tracks = try? await asset.loadTracks(withMediaType: .video)
    let size = try? await tracks?.first?.load(.naturalSize) ?? .zero
    let transform = try? await tracks?.first?.load(.preferredTransform) ?? .identity

    // Calculate actual dimensions considering transform
    var width = Int(size?.width ?? 1920)
    var height = Int(size?.height ?? 1080)

    if let transform = transform {
      let isRotated = transform.a == 0 && transform.d == 0
      if isRotated {
        swap(&width, &height)
      }
    }

    // Get file size
    let fileSize = (try? fileManager.attributesOfItem(atPath: videoURL.path)[.size] as? Int64) ?? 0

    // Create video location
    var videoLocation: VideoLocation?
    if let location = currentLocation {
      videoLocation = VideoLocation(
        latitude: location.coordinate.latitude,
        longitude: location.coordinate.longitude,
        address: nil
      )
    }

    // Create video object
    let video = TravelVideo(
      id: UUID(),
      title: generateVideoTitle(),
      fileName: videoURL.lastPathComponent,
      thumbnailFileName: thumbnailFileName,
      duration: duration ?? recordingDuration,
      fileSize: fileSize,
      width: width,
      height: height,
      quality: videoQuality,
      location: videoLocation
    )

    // Add to videos list
    videos.insert(video, at: 0)
    saveVideos()

    logger.info("Saved video: \(video.title), duration: \(video.formattedDuration)")

    currentVideoURL = nil
    currentThumbnail = nil
    currentLocation = nil

    return video
  }

  func cancelRecording() {
    guard isRecording else { return }

    videoOutput?.stopRecording()
    stopRecordingTimer()
    stopLocationUpdates()
    isRecording = false
    recordingDuration = 0

    // Delete the recording file
    if let url = currentVideoURL {
      try? fileManager.removeItem(at: url)
      logger.info("Cancelled recording, deleted: \(url.lastPathComponent)")
    }

    currentVideoURL = nil
    currentThumbnail = nil
  }

  private func startRecordingTimer() {
    recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
      Task { @MainActor [weak self] in
        guard let self else { return }
        self.recordingDuration += 0.1

        // Auto-stop at max duration
        if self.recordingDuration >= self.maxDuration {
          _ = await self.stopRecording()
        }
      }
    }
  }

  private func stopRecordingTimer() {
    recordingTimer?.invalidate()
    recordingTimer = nil
  }

  private func currentVideoOrientation() -> AVCaptureVideoOrientation {
    guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene else {
      return .portrait
    }

    switch windowScene.interfaceOrientation {
    case .portrait: return .portrait
    case .portraitUpsideDown: return .portraitUpsideDown
    case .landscapeLeft: return .landscapeLeft
    case .landscapeRight: return .landscapeRight
    default: return .portrait
    }
  }

  // MARK: - Thumbnail Generation

  private func generateThumbnail(for videoURL: URL) async -> String? {
    let asset = AVURLAsset(url: videoURL)
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.maximumSize = CGSize(width: 400, height: 400)

    let time = CMTime(seconds: 0.5, preferredTimescale: 600)

    do {
      let (cgImage, _) = try await generator.image(at: time)
      let uiImage = UIImage(cgImage: cgImage)

      // Save thumbnail
      let thumbnailFileName = "thumb_\(videoURL.deletingPathExtension().lastPathComponent).jpg"
      let thumbnailURL = thumbnailsDirectory.appendingPathComponent(thumbnailFileName)

      if let jpegData = uiImage.jpegData(compressionQuality: 0.8) {
        try jpegData.write(to: thumbnailURL)
        currentThumbnail = uiImage
        return thumbnailFileName
      }
    } catch {
      logger.error("Failed to generate thumbnail: \(error.localizedDescription)")
    }

    return nil
  }

  // MARK: - Video Management

  func deleteVideo(_ video: TravelVideo) {
    // Delete video file
    let videoURL = videosDirectory.appendingPathComponent(video.fileName)
    try? fileManager.removeItem(at: videoURL)

    // Delete thumbnail
    if let thumbnailFileName = video.thumbnailFileName {
      let thumbnailURL = thumbnailsDirectory.appendingPathComponent(thumbnailFileName)
      try? fileManager.removeItem(at: thumbnailURL)
    }

    // Remove from list
    videos.removeAll { $0.id == video.id }
    saveVideos()

    logger.info("Deleted video: \(video.title)")
  }

  func updateVideo(_ video: TravelVideo) {
    if let index = videos.firstIndex(where: { $0.id == video.id }) {
      var updatedVideo = video
      updatedVideo.updatedAt = Date()
      videos[index] = updatedVideo
      saveVideos()
    }
  }

  func fileURL(for video: TravelVideo) -> URL {
    videosDirectory.appendingPathComponent(video.fileName)
  }

  func thumbnailURL(for video: TravelVideo) -> URL? {
    guard let thumbnailFileName = video.thumbnailFileName else { return nil }
    return thumbnailsDirectory.appendingPathComponent(thumbnailFileName)
  }

  func fileExists(for video: TravelVideo) -> Bool {
    fileManager.fileExists(atPath: fileURL(for: video).path)
  }

  // MARK: - Filtering Methods

  func videosForItinerary(_ itineraryId: String) -> [TravelVideo] {
    videos.filter { $0.itineraryId == itineraryId }
  }

  func videosForPoi(_ poiId: String) -> [TravelVideo] {
    videos.filter { $0.poiId == poiId }
  }

  func videosForDay(itineraryId: String, dayNumber: Int) -> [TravelVideo] {
    videos.filter { $0.itineraryId == itineraryId && $0.dayNumber == dayNumber }
  }

  func unassociatedVideos() -> [TravelVideo] {
    videos.filter { $0.itineraryId == nil && $0.poiId == nil }
  }

  func video(byId id: UUID) -> TravelVideo? {
    videos.first { $0.id == id }
  }

  // MARK: - Photo Library

  func saveToPhotoLibrary(_ video: TravelVideo) async throws {
    let videoURL = fileURL(for: video)

    guard fileManager.fileExists(atPath: videoURL.path) else {
      throw VideoRecordingError.fileNotFound
    }

    let status = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
    guard status == .authorized else {
      throw VideoRecordingError.photoLibraryNotAuthorized
    }

    try await PHPhotoLibrary.shared().performChanges {
      PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: videoURL)
    }

    logger.info("Saved video to photo library: \(video.title)")
  }

  // MARK: - Private Helpers

  private func generateVideoTitle() -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "MM-dd HH:mm"
    return "视频 \(formatter.string(from: Date()))"
  }

  private func loadVideos() {
    let listURL = videosDirectory.appendingPathComponent(videosListFileName)
    guard let data = try? Data(contentsOf: listURL) else { return }

    do {
      videos = try JSONDecoder().decode([TravelVideo].self, from: data)
      logger.info("Loaded \(self.videos.count) videos")
    } catch {
      logger.error("Failed to load videos: \(error.localizedDescription)")
    }
  }

  private func saveVideos() {
    let listURL = videosDirectory.appendingPathComponent(videosListFileName)
    do {
      let data = try JSONEncoder().encode(videos)
      try data.write(to: listURL)
    } catch {
      logger.error("Failed to save videos: \(error.localizedDescription)")
    }
  }

  // MARK: - Storage Info

  var totalStorageUsed: Int64 {
    var total: Int64 = 0
    for video in videos {
      total += video.fileSize
    }
    return total
  }

  var formattedStorageUsed: String {
    ByteCountFormatter.string(fromByteCount: totalStorageUsed, countStyle: .file)
  }
}

// MARK: - AVCaptureFileOutputRecordingDelegate

extension VideoRecordingManager: AVCaptureFileOutputRecordingDelegate {
  nonisolated func fileOutput(
    _ output: AVCaptureFileOutput,
    didFinishRecordingTo outputFileURL: URL,
    from connections: [AVCaptureConnection],
    error: Error?
  ) {
    Task { @MainActor in
      if let error = error {
        logger.error("Recording finished with error: \(error.localizedDescription)")
        errorMessage = error.localizedDescription
      } else {
        logger.info("Recording finished successfully")
      }
    }
  }

  nonisolated func fileOutput(
    _ output: AVCaptureFileOutput,
    didStartRecordingTo fileURL: URL,
    from connections: [AVCaptureConnection]
  ) {
    Task { @MainActor in
      logger.info("Recording started")
    }
  }
}

// MARK: - CLLocationManagerDelegate

extension VideoRecordingManager: CLLocationManagerDelegate {
  nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else { return }
    Task { @MainActor in
      self.currentLocation = location
    }
  }

  nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    Task { @MainActor in
      logger.error("Location error: \(error.localizedDescription)")
    }
  }
}

// MARK: - Video Recording Error

enum VideoRecordingError: LocalizedError {
  case cameraNotAuthorized
  case microphoneNotAuthorized
  case cameraNotAvailable
  case configurationFailed
  case recordingFailed
  case fileNotFound
  case exportFailed
  case photoLibraryNotAuthorized

  var errorDescription: String? {
    switch self {
    case .cameraNotAuthorized:
      return "未获得相机权限"
    case .microphoneNotAuthorized:
      return "未获得麦克风权限"
    case .cameraNotAvailable:
      return "相机不可用"
    case .configurationFailed:
      return "相机配置失败"
    case .recordingFailed:
      return "录制失败"
    case .fileNotFound:
      return "视频文件不存在"
    case .exportFailed:
      return "导出失败"
    case .photoLibraryNotAuthorized:
      return "未获得相册权限"
    }
  }
}
