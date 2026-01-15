import CarPlay
import CoreLocation
import Foundation
import MapKit
import OSLog

/// Manages navigation state and routing for CarPlay
@MainActor
final class CarPlayNavigationManager: NSObject {
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "CarPlayNavigation")

  // MARK: - Properties

  /// Current location manager
  private let locationManager = CLLocationManager()

  /// Current destination POI
  private(set) var currentDestination: AiPoi?

  /// Current navigation session
  private(set) var navigationSession: CPNavigationSession?

  /// Current trip
  private(set) var currentTrip: CPTrip?

  /// Delegate for navigation updates
  weak var delegate: CarPlayNavigationDelegate?

  /// Whether navigation is active
  var isNavigating: Bool {
    navigationSession != nil
  }

  // MARK: - Initialization

  override init() {
    super.init()
    locationManager.delegate = self
    locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
  }

  // MARK: - Navigation Control

  /// Start navigation to a POI
  /// - Parameters:
  ///   - poi: The destination POI
  ///   - mapTemplate: The CarPlay map template
  func startNavigation(to poi: AiPoi, on mapTemplate: CPMapTemplate) async {
    guard let lat = poi.latitude, let lng = poi.longitude else {
      logger.error("Cannot navigate: POI has no coordinates")
      return
    }

    logger.info("Starting navigation to: \(poi.name)")

    currentDestination = poi

    // Create destination
    let destinationCoordinate = CLLocationCoordinate2D(latitude: lat, longitude: lng)
    let destinationPlacemark = MKPlacemark(coordinate: destinationCoordinate)
    let destinationMapItem = MKMapItem(placemark: destinationPlacemark)
    destinationMapItem.name = poi.name

    // Create trip
    let trip = CPTrip(
      origin: MKMapItem.forCurrentLocation(),
      destination: destinationMapItem,
      routeChoices: []
    )

    currentTrip = trip

    // Calculate route
    await calculateRoute(to: destinationMapItem)

    // Start navigation session
    navigationSession = mapTemplate.startNavigationSession(for: trip)
    navigationSession?.pauseTrip(for: .loading, description: "正在计算路线...")

    // Request location updates
    locationManager.requestWhenInUseAuthorization()
    locationManager.startUpdatingLocation()

    // Notify delegate
    delegate?.navigationDidStart(to: poi)

    // Post notification
    NotificationCenter.default.post(name: .carPlayNavigationStarted, object: poi)
  }

  /// Stop current navigation
  func stopNavigation() {
    logger.info("Stopping navigation")

    navigationSession?.finishTrip()
    navigationSession = nil
    currentTrip = nil
    currentDestination = nil

    locationManager.stopUpdatingLocation()

    delegate?.navigationDidEnd()

    NotificationCenter.default.post(name: .carPlayNavigationEnded, object: nil)
  }

  /// Pause navigation (e.g., when user stops at POI)
  func pauseNavigation(reason: CPNavigationSession.PauseReason, description: String) {
    navigationSession?.pauseTrip(for: reason, description: description)
    delegate?.navigationDidPause(reason: description)
  }

  /// Resume navigation
  func resumeNavigation() {
    // Resume trip by updating maneuvers
    if let currentManeuver = createCurrentManeuver() {
      navigationSession?.upcomingManeuvers = [currentManeuver]
    }
    delegate?.navigationDidResume()
  }

  // MARK: - Route Calculation

  private func calculateRoute(to destination: MKMapItem) async {
    let request = MKDirections.Request()
    request.source = MKMapItem.forCurrentLocation()
    request.destination = destination
    request.transportType = .automobile
    request.requestsAlternateRoutes = true

    let directions = MKDirections(request: request)

    do {
      let response = try await directions.calculate()

      if let route = response.routes.first {
        logger.info("Route calculated: \(route.distance)m, \(route.expectedTravelTime)s")

        // Update session with route info
        if let session = navigationSession {
          // Create maneuvers from route steps
          let maneuvers = createManeuvers(from: route)
          session.upcomingManeuvers = maneuvers

          // Update estimates for the first maneuver
          if let firstManeuver = maneuvers.first {
            let estimates = CPTravelEstimates(
              distanceRemaining: Measurement(value: route.distance, unit: .meters),
              timeRemaining: route.expectedTravelTime
            )
            session.updateEstimates(estimates, for: firstManeuver)
          }

          // Resume trip
          session.finishTrip()
        }

        delegate?.routeCalculated(distance: route.distance, duration: route.expectedTravelTime)
      }
    } catch {
      logger.error("Route calculation failed: \(error.localizedDescription)")
      navigationSession?.pauseTrip(for: .loading, description: "路线计算失败")
      delegate?.routeCalculationFailed(error: error)
    }
  }

  private func createManeuvers(from route: MKRoute) -> [CPManeuver] {
    return route.steps.compactMap { step -> CPManeuver? in
      guard !step.instructions.isEmpty else { return nil }

      let maneuver = CPManeuver()
      maneuver.instructionVariants = [step.instructions]

      // Estimate distance and time (assuming average speed of 10 m/s)
      let estimatedTime = step.distance / 10.0
      maneuver.initialTravelEstimates = CPTravelEstimates(
        distanceRemaining: Measurement(value: step.distance, unit: .meters),
        timeRemaining: estimatedTime
      )

      // Set maneuver type based on instructions
      maneuver.symbolImage = symbolForInstruction(step.instructions)

      return maneuver
    }
  }

  private func createCurrentManeuver() -> CPManeuver? {
    guard let destination = currentDestination else { return nil }

    let maneuver = CPManeuver()
    maneuver.instructionVariants = ["前往 \(destination.name)"]
    maneuver.symbolImage = UIImage(systemName: "arrow.up")

    return maneuver
  }

  // MARK: - Helper Methods

  private func formatDistance(_ meters: CLLocationDistance) -> String {
    if meters >= 1000 {
      return String(format: "%.1f公里", meters / 1000)
    } else {
      return String(format: "%.0f米", meters)
    }
  }

  private func symbolForInstruction(_ instruction: String) -> UIImage? {
    let lowercased = instruction.lowercased()

    if lowercased.contains("左") || lowercased.contains("left") {
      return UIImage(systemName: "arrow.turn.up.left")
    } else if lowercased.contains("右") || lowercased.contains("right") {
      return UIImage(systemName: "arrow.turn.up.right")
    } else if lowercased.contains("掉头") || lowercased.contains("u-turn") {
      return UIImage(systemName: "arrow.uturn.down")
    } else if lowercased.contains("到达") || lowercased.contains("destination")
      || lowercased.contains("arrive")
    {
      return UIImage(systemName: "flag.checkered")
    } else {
      return UIImage(systemName: "arrow.up")
    }
  }

  // MARK: - ETA Calculation

  /// Calculate ETA to current destination
  func calculateETA() async -> Date? {
    guard let destination = currentDestination,
      let lat = destination.latitude,
      let lng = destination.longitude
    else { return nil }

    let destinationCoordinate = CLLocationCoordinate2D(latitude: lat, longitude: lng)
    let destinationPlacemark = MKPlacemark(coordinate: destinationCoordinate)
    let destinationMapItem = MKMapItem(placemark: destinationPlacemark)

    let request = MKDirections.Request()
    request.source = MKMapItem.forCurrentLocation()
    request.destination = destinationMapItem
    request.transportType = .automobile

    let directions = MKDirections(request: request)

    do {
      let etaResponse = try await directions.calculateETA()
      return etaResponse.expectedArrivalDate
    } catch {
      logger.error("ETA calculation failed: \(error.localizedDescription)")
      return nil
    }
  }

  // MARK: - Distance Calculation

  /// Calculate distance to current destination
  func distanceToDestination() -> CLLocationDistance? {
    guard let destination = currentDestination,
      let destLat = destination.latitude,
      let destLng = destination.longitude,
      let currentLocation = locationManager.location
    else { return nil }

    let destLocation = CLLocation(latitude: destLat, longitude: destLng)
    return currentLocation.distance(from: destLocation)
  }
}

// MARK: - CLLocationManagerDelegate

extension CarPlayNavigationManager: CLLocationManagerDelegate {
  nonisolated func locationManager(
    _ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]
  ) {
    guard let location = locations.last else { return }

    Task { @MainActor in
      // Check if we're close to destination
      if let destination = currentDestination,
        let destLat = destination.latitude,
        let destLng = destination.longitude
      {
        let destLocation = CLLocation(latitude: destLat, longitude: destLng)
        let distance = location.distance(from: destLocation)

        // If within 50 meters, consider arrived
        if distance < 50 {
          delegate?.arrivedAtDestination(destination)
        }

        // Update travel estimates for current maneuver
        if let session = navigationSession,
          let currentManeuver = session.upcomingManeuvers.first
        {
          let estimates = CPTravelEstimates(
            distanceRemaining: Measurement(value: distance, unit: .meters),
            timeRemaining: distance / 10  // Rough estimate: 10 m/s
          )
          session.updateEstimates(estimates, for: currentManeuver)
        }
      }
    }
  }

  nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    Task { @MainActor in
      logger.error("Location update failed: \(error.localizedDescription)")
    }
  }
}

// MARK: - CarPlayNavigationDelegate

protocol CarPlayNavigationDelegate: AnyObject {
  func navigationDidStart(to poi: AiPoi)
  func navigationDidEnd()
  func navigationDidPause(reason: String)
  func navigationDidResume()
  func routeCalculated(distance: CLLocationDistance, duration: TimeInterval)
  func routeCalculationFailed(error: Error)
  func arrivedAtDestination(_ poi: AiPoi)
}

// MARK: - Default Implementation

extension CarPlayNavigationDelegate {
  func navigationDidStart(to poi: AiPoi) {}
  func navigationDidEnd() {}
  func navigationDidPause(reason: String) {}
  func navigationDidResume() {}
  func routeCalculated(distance: CLLocationDistance, duration: TimeInterval) {}
  func routeCalculationFailed(error: Error) {}
  func arrivedAtDestination(_ poi: AiPoi) {}
}
