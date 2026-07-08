import SwiftUI

// MARK: - Siri Navigation View Modifier

/// View modifier that handles Siri navigation actions
@available(iOS 16.0, *)
struct SiriNavigationModifier: ViewModifier {
  let action: SiriNavigationAction?

  @State private var showItineraryDetail: Bool = false
  @State private var selectedItineraryId: String?
  @State private var selectedDayNumber: Int?
  @State private var searchQuery: String?
  @State private var showSearch: Bool = false
  @State private var showItineraryList: Bool = false
  @State private var showNearbySearch: Bool = false
  @State private var nearbySearchType: String?

  func body(content: Content) -> some View {
    content
      .onChange(of: action) { oldValue, newValue in
        handleNavigationAction(newValue)
      }
      .onAppear {
        // Handle action on initial appear as well
        handleNavigationAction(action)
      }
  }

  private func handleNavigationAction(_ action: SiriNavigationAction?) {
    guard let action = action else { return }

    switch action {
    case .viewItinerary(let id, let day):
      selectedItineraryId = id
      selectedDayNumber = day
      showItineraryDetail = true
      // Post notification for navigation
      NotificationCenter.default.post(
        name: .siriNavigateToItinerary,
        object: nil,
        userInfo: ["id": id, "day": day as Any]
      )

    case .navigateToPOI(let name, let latitude, let longitude):
      // Post notification for POI navigation
      var userInfo: [String: Any] = ["name": name]
      if let lat = latitude { userInfo["latitude"] = lat }
      if let lon = longitude { userInfo["longitude"] = lon }
      NotificationCenter.default.post(
        name: .siriNavigateToPOI,
        object: nil,
        userInfo: userInfo
      )

    case .search(let query):
      searchQuery = query
      showSearch = true
      NotificationCenter.default.post(
        name: .siriPerformSearch,
        object: nil,
        userInfo: ["query": query]
      )

    case .showItineraryList:
      showItineraryList = true
      NotificationCenter.default.post(
        name: .siriShowItineraryList,
        object: nil
      )

    case .searchNearby(let type):
      nearbySearchType = type
      showNearbySearch = true
      NotificationCenter.default.post(
        name: .siriSearchNearby,
        object: nil,
        userInfo: ["type": type as Any]
      )
    }

    // Clear the pending navigation after handling
    SiriShortcutsManager.shared.clearPendingNavigation()
  }
}

// MARK: - View Extension

extension View {
  /// Handles Siri navigation actions
  @ViewBuilder
  func onSiriNavigationAction(_ action: SiriNavigationAction?) -> some View {
    self.modifier(SiriNavigationModifier(action: action))
  }
}

// MARK: - Notification Names

extension Notification.Name {
  static let siriNavigateToItinerary = Notification.Name("siriNavigateToItinerary")
  static let siriNavigateToPOI = Notification.Name("siriNavigateToPOI")
  static let siriPerformSearch = Notification.Name("siriPerformSearch")
  static let siriShowItineraryList = Notification.Name("siriShowItineraryList")
  static let siriSearchNearby = Notification.Name("siriSearchNearby")
}
