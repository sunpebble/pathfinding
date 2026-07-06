import CarPlay
import Foundation
import OSLog

/// CarPlay Scene Delegate - Entry point for CarPlay functionality
/// Manages the lifecycle of CarPlay connection and disconnection
final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
  private let logger = Logger(subsystem: "com.sunpebble.trips", category: "CarPlay")

  /// The CarPlay interface controller
  var interfaceController: CPInterfaceController?

  /// The CarPlay manager instance
  private var carPlayManager: CarPlayManager?

  // MARK: - CPTemplateApplicationSceneDelegate

  func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didConnect interfaceController: CPInterfaceController
  ) {
    logger.info("CarPlay connected")
    self.interfaceController = interfaceController

    // Initialize CarPlay manager
    carPlayManager = CarPlayManager(interfaceController: interfaceController)

    // Setup initial template
    Task { @MainActor in
      await carPlayManager?.setupInitialTemplate()
    }

    // Post notification for app to handle CarPlay connection
    NotificationCenter.default.post(name: .carPlayDidConnect, object: nil)
  }

  func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didDisconnect interfaceController: CPInterfaceController
  ) {
    logger.info("CarPlay disconnected")
    self.interfaceController = nil
    carPlayManager = nil

    // Post notification for app to handle CarPlay disconnection
    NotificationCenter.default.post(name: .carPlayDidDisconnect, object: nil)
  }

  func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didSelect navigationAlert: CPNavigationAlert
  ) {
    logger.info("Navigation alert selected")
  }

  func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didSelect maneuver: CPManeuver
  ) {
    logger.info("Maneuver selected: \(maneuver.instructionVariants.first ?? "unknown")")
  }
}

// MARK: - Notification Names

extension Notification.Name {
  static let carPlayDidConnect = Notification.Name("CarPlayDidConnect")
  static let carPlayDidDisconnect = Notification.Name("CarPlayDidDisconnect")
  static let carPlayNavigationStarted = Notification.Name("CarPlayNavigationStarted")
  static let carPlayNavigationEnded = Notification.Name("CarPlayNavigationEnded")
}
