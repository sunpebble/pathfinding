import SwiftUI

@main
struct PathfindingApp: App {
  @StateObject private var authViewModel = AuthViewModel()
  @State private var themeManager = ThemeManager.shared
  @State private var localizationManager = LocalizationManager.shared

  init() {
    applyUITestLaunchOverrides()
    configureAppearance()
  }

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(authViewModel)
        .environment(themeManager)
        .environment(localizationManager)
        .withTheme(themeManager)
        .withLocalization()
    }
  }

  private func configureAppearance() {
    // Configure navigation bar appearance
    let navBarAppearance = UINavigationBarAppearance()
    navBarAppearance.configureWithDefaultBackground()
    navBarAppearance.titleTextAttributes = [
      .font: UIFont.systemFont(ofSize: 17, weight: .semibold)
    ]
    navBarAppearance.largeTitleTextAttributes = [
      .font: UIFont.systemFont(ofSize: 34, weight: .bold)
    ]

    UINavigationBar.appearance().standardAppearance = navBarAppearance
    UINavigationBar.appearance().scrollEdgeAppearance = navBarAppearance
    UINavigationBar.appearance().compactAppearance = navBarAppearance

    // Configure tab bar appearance
    let tabBarAppearance = UITabBarAppearance()
    tabBarAppearance.configureWithDefaultBackground()

    UITabBar.appearance().standardAppearance = tabBarAppearance
    UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
  }

  private func applyUITestLaunchOverrides() {
    let environment = ProcessInfo.processInfo.environment
    guard environment["PATHFINDING_UI_TEST_RESET_STATE"] == "1" else {
      return
    }

    if let bundleIdentifier = Bundle.main.bundleIdentifier {
      UserDefaults.standard.removePersistentDomain(forName: bundleIdentifier)
    }
    UserDefaults.standard.synchronize()
    AuthManager.resetPersistedSessionForTesting()
  }
}

// MARK: - RootView

struct RootView: View {
  @EnvironmentObject private var authViewModel: AuthViewModel
  @State private var siriNavigationAction: SiriNavigationAction?
  @Environment(\.scenePhase) private var scenePhase

  var body: some View {
    Group {
      if authViewModel.isLoading {
        ProgressView()
          .controlSize(.large)
      } else if authViewModel.isAuthenticated || authViewModel.isGuestMode {
        ContentView()
          .onSiriNavigationAction(siriNavigationAction)
      } else {
        LoginView()
      }
    }
    .task {
      await authViewModel.initialize()
    }
    .onChange(of: scenePhase) { oldPhase, newPhase in
      if newPhase == .active {
        checkPendingSiriNavigation()
      }
    }
  }

  private func checkPendingSiriNavigation() {
    siriNavigationAction = SiriShortcutsManager.shared.checkPendingNavigation()
  }
}

// MARK: - AuthViewModel

/// Observable wrapper for AuthManager to provide reactive authentication state to SwiftUI
@MainActor
final class AuthViewModel: ObservableObject {
  @Published private(set) var isAuthenticated: Bool = false
  @Published private(set) var isLoading: Bool = true
  @Published private(set) var userEmail: String?
  @Published private(set) var isGuestMode: Bool = false

  /// Initialize and check for existing session
  func initialize() async {
    // Check for stored guest mode preference
    isGuestMode = UserDefaults.standard.bool(forKey: "isGuestMode")

    if isGuestMode {
      isLoading = false
      return
    }

    // Ensure AuthManager has loaded stored session from Keychain
    await AuthManager.shared.ensureSessionLoaded()

    await updateAuthState()
    isLoading = false
  }

  /// Update authentication state from AuthManager
  func updateAuthState() async {
    let authManager = AuthManager.shared
    let newIsAuthenticated = await authManager.isAuthenticated
    let newUserEmail = await authManager.userEmail

    self.isAuthenticated = newIsAuthenticated
    self.userEmail = newUserEmail

    // If user logged in successfully, clear guest mode
    if newIsAuthenticated {
      self.isGuestMode = false
      UserDefaults.standard.set(false, forKey: "isGuestMode")
    }
  }

  /// Continue as guest without authentication
  func continueAsGuest() {
    isGuestMode = true
    UserDefaults.standard.set(true, forKey: "isGuestMode")
  }

  /// Sign out the current user
  func signOut() async throws {
    try await AuthManager.shared.signOut()
    isGuestMode = false
    UserDefaults.standard.set(false, forKey: "isGuestMode")
    await updateAuthState()
  }
}
