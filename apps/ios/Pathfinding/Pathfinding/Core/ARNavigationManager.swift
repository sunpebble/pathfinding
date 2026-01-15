import ARKit
import CoreLocation
import Foundation
import Observation
import RealityKit
import UIKit

/// Manager for AR navigation session
@MainActor
@Observable
final class ARNavigationManager: NSObject {
  // MARK: - Singleton

  static let shared = ARNavigationManager()

  // MARK: - State

  /// Current navigation state
  private(set) var state: ARNavigationState = .initializing

  /// Current route being navigated
  var route: ARNavigationRoute?

  /// All POIs with updated AR data
  private(set) var pois: [ARPoi] = []

  /// Current user location
  private(set) var userLocation: CLLocationCoordinate2D?

  /// Current device heading (degrees)
  private(set) var deviceHeading: Double = 0

  /// Current camera frame for photo capture
  private(set) var currentFrame: ARFrame?

  /// Settings for AR navigation
  var settings = ARNavigationSettings.default

  /// Whether AR session is running
  private(set) var isSessionRunning = false

  /// Captured photos
  private(set) var capturedPhotos: [ARPhoto] = []

  // MARK: - Private Properties

  private var locationManager: CLLocationManager?
  private var arSession: ARSession?
  private var lastLocationUpdate = Date()
  private let locationUpdateThrottle: TimeInterval = 0.5

  // MARK: - Initialization

  private override init() {
    super.init()
    setupLocationManager()
  }

  // MARK: - Location Manager Setup

  private func setupLocationManager() {
    locationManager = CLLocationManager()
    locationManager?.delegate = self
    locationManager?.desiredAccuracy = kCLLocationAccuracyBest
    locationManager?.headingFilter = 1 // Update on 1 degree change
    locationManager?.distanceFilter = 1 // Update on 1 meter movement
  }

  // MARK: - Public Methods

  /// Start AR navigation with a route
  func startNavigation(with route: ARNavigationRoute) {
    self.route = route
    self.pois = route.pois
    state = .initializing

    // Request location permissions
    locationManager?.requestWhenInUseAuthorization()

    // Start location updates
    locationManager?.startUpdatingLocation()
    locationManager?.startUpdatingHeading()

    NSLog("[AR] Started navigation with \(route.pois.count) POIs")
  }

  /// Stop AR navigation
  func stopNavigation() {
    stopARSession()
    locationManager?.stopUpdatingLocation()
    locationManager?.stopUpdatingHeading()
    route = nil
    pois = []
    state = .paused
    NSLog("[AR] Navigation stopped")
  }

  /// Configure and start AR session
  func configureARSession(_ session: ARSession) {
    self.arSession = session
    session.delegate = self

    let configuration = ARWorldTrackingConfiguration()
    configuration.worldAlignment = .gravityAndHeading
    configuration.planeDetection = []

    // Enable auto-focus for better tracking
    if ARWorldTrackingConfiguration.supportsFrameSemantics(.personSegmentationWithDepth) {
      // Available on newer devices
    }

    session.run(configuration, options: [.resetTracking, .removeExistingAnchors])
    isSessionRunning = true
    state = .tracking

    NSLog("[AR] AR session configured and started")
  }

  /// Stop AR session
  func stopARSession() {
    arSession?.pause()
    arSession = nil
    isSessionRunning = false
    NSLog("[AR] AR session stopped")
  }

  /// Capture AR photo
  func capturePhoto() -> ARPhoto? {
    guard let frame = currentFrame else {
      NSLog("[AR] No frame available for capture")
      return nil
    }

    // Convert AR frame to image
    let pixelBuffer = frame.capturedImage
    let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
    let context = CIContext()

    guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else {
      NSLog("[AR] Failed to create CGImage")
      return nil
    }

    // Rotate image to correct orientation
    let uiImage = UIImage(cgImage: cgImage, scale: 1.0, orientation: .right)

    guard let imageData = uiImage.jpegData(compressionQuality: 0.8) else {
      NSLog("[AR] Failed to convert image to JPEG")
      return nil
    }

    let photo = ARPhoto(
      imageData: imageData,
      poi: route?.currentTarget,
      heading: deviceHeading
    )

    capturedPhotos.append(photo)
    NSLog("[AR] Photo captured: \(photo.id)")

    return photo
  }

  /// Move to next POI in route
  func moveToNextPoi() -> Bool {
    guard var currentRoute = route else { return false }
    let success = currentRoute.moveToNext()
    if success {
      route = currentRoute
      triggerHapticFeedback()
    }
    return success
  }

  /// Move to previous POI in route
  func moveToPreviousPoi() -> Bool {
    guard var currentRoute = route else { return false }
    let success = currentRoute.moveToPrevious()
    if success {
      route = currentRoute
    }
    return success
  }

  /// Select specific POI
  func selectPoi(at index: Int) {
    guard var currentRoute = route else { return }
    currentRoute.selectPoi(at: index)
    route = currentRoute
  }

  /// Clear all captured photos
  func clearPhotos() {
    capturedPhotos.removeAll()
  }

  // MARK: - Private Methods

  /// Update POI positions relative to user
  private func updatePoiPositions() {
    guard let userLocation = userLocation else { return }

    pois = pois.map { poi in
      var updatedPoi = poi

      // Calculate distance
      updatedPoi.distance = LocationMath.distance(from: userLocation, to: poi.coordinate)

      // Calculate bearing
      updatedPoi.bearing = LocationMath.bearing(from: userLocation, to: poi.coordinate)

      // Calculate AR position
      updatedPoi.arPosition = LocationMath.bearingToPosition(
        bearing: updatedPoi.bearing,
        distance: updatedPoi.distance,
        deviceHeading: deviceHeading
      )

      // Check visibility (within max distance)
      updatedPoi.isVisible = updatedPoi.distance <= settings.maxPoiDistance

      return updatedPoi
    }

    // Check for arrival at current target
    checkArrival()
  }

  /// Check if user has arrived at current target
  private func checkArrival() {
    guard let target = route?.currentTarget else { return }

    if let poi = pois.first(where: { $0.id == target.id }),
       poi.distance <= settings.arrivalThreshold
    {
      triggerHapticFeedback()

      if settings.autoAdvance {
        _ = moveToNextPoi()
      }
    }
  }

  /// Trigger haptic feedback
  private func triggerHapticFeedback() {
    guard settings.hapticFeedback else { return }

    let generator = UINotificationFeedbackGenerator()
    generator.notificationOccurred(.success)
  }
}

// MARK: - CLLocationManagerDelegate

extension ARNavigationManager: CLLocationManagerDelegate {
  nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let location = locations.last else { return }

    Task { @MainActor in
      // Throttle updates
      guard Date().timeIntervalSince(lastLocationUpdate) >= locationUpdateThrottle else { return }
      lastLocationUpdate = Date()

      userLocation = location.coordinate
      updatePoiPositions()
    }
  }

  nonisolated func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
    guard newHeading.headingAccuracy >= 0 else { return }
    let heading = newHeading.trueHeading

    Task { @MainActor in
      deviceHeading = heading
      updatePoiPositions()
    }
  }

  nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    let errorMessage = error.localizedDescription
    Task { @MainActor in
      NSLog("[AR] Location error: \(errorMessage)")
      state = .error(message: "定位失败: \(errorMessage)")
    }
  }

  nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    let status = manager.authorizationStatus
    Task { @MainActor in
      switch status {
      case .authorizedWhenInUse, .authorizedAlways:
        NSLog("[AR] Location authorized")
        locationManager?.startUpdatingLocation()
        locationManager?.startUpdatingHeading()
      case .denied, .restricted:
        state = .error(message: "需要位置权限才能使用 AR 导航")
      case .notDetermined:
        break
      @unknown default:
        break
      }
    }
  }
}

// MARK: - ARSessionDelegate

extension ARNavigationManager: ARSessionDelegate {
  nonisolated func session(_ session: ARSession, didUpdate frame: ARFrame) {
    Task { @MainActor in
      currentFrame = frame
    }
  }

  nonisolated func session(_ session: ARSession, didFailWithError error: Error) {
    Task { @MainActor in
      NSLog("[AR] Session error: \(error.localizedDescription)")
      state = .error(message: "AR 会话错误: \(error.localizedDescription)")
    }
  }

  nonisolated func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
    Task { @MainActor in
      switch camera.trackingState {
      case .normal:
        state = .tracking
      case .notAvailable:
        state = .error(message: "AR 不可用")
      case .limited(let reason):
        switch reason {
        case .initializing:
          state = .limited(reason: .initializing)
        case .excessiveMotion:
          state = .limited(reason: .excessiveMotion)
        case .insufficientFeatures:
          state = .limited(reason: .insufficientFeatures)
        case .relocalizing:
          state = .limited(reason: .relocalizing)
        @unknown default:
          state = .limited(reason: .initializing)
        }
      }
    }
  }

  nonisolated func sessionWasInterrupted(_ session: ARSession) {
    Task { @MainActor in
      state = .paused
      NSLog("[AR] Session interrupted")
    }
  }

  nonisolated func sessionInterruptionEnded(_ session: ARSession) {
    Task { @MainActor in
      state = .tracking
      NSLog("[AR] Session interruption ended")
    }
  }
}
