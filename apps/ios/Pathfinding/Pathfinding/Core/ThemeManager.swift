import MapKit
import SwiftUI
import Observation

// MARK: - Theme Mode

/// Represents the app's theme mode selection
enum ThemeMode: String, CaseIterable, Identifiable {
  case system = "system"
  case light = "light"
  case dark = "dark"

  var id: String { rawValue }

  var displayName: String {
    switch self {
    case .system: return "theme.system".localized
    case .light: return "theme.light".localized
    case .dark: return "theme.dark".localized
    }
  }

  var icon: String {
    switch self {
    case .system: return "circle.lefthalf.filled"
    case .light: return "sun.max.fill"
    case .dark: return "moon.fill"
    }
  }

  var iconColor: Color {
    switch self {
    case .system: return .indigo
    case .light: return .orange
    case .dark: return .purple
    }
  }

  /// Convert to UIKit's UIUserInterfaceStyle
  var userInterfaceStyle: UIUserInterfaceStyle {
    switch self {
    case .system: return .unspecified
    case .light: return .light
    case .dark: return .dark
    }
  }

  /// Convert to SwiftUI's ColorScheme (nil for system)
  var colorScheme: ColorScheme? {
    switch self {
    case .system: return nil
    case .light: return .light
    case .dark: return .dark
    }
  }
}

// MARK: - Accent Color Option

/// Available accent colors for the app
enum AccentColorOption: String, CaseIterable, Identifiable {
  case indigo = "indigo"
  case blue = "blue"
  case purple = "purple"
  case pink = "pink"
  case red = "red"
  case orange = "orange"
  case green = "green"
  case teal = "teal"
  case cyan = "cyan"
  case mint = "mint"

  var id: String { rawValue }

  var displayName: String {
    switch self {
    case .indigo: return "color.indigo".localized
    case .blue: return "color.blue".localized
    case .purple: return "color.purple".localized
    case .pink: return "color.pink".localized
    case .red: return "color.red".localized
    case .orange: return "color.orange".localized
    case .green: return "color.green".localized
    case .teal: return "color.teal".localized
    case .cyan: return "color.cyan".localized
    case .mint: return "color.mint".localized
    }
  }

  var color: Color {
    switch self {
    case .indigo: return .indigo
    case .blue: return .blue
    case .purple: return .purple
    case .pink: return .pink
    case .red: return .red
    case .orange: return .orange
    case .green: return .green
    case .teal: return .teal
    case .cyan: return .cyan
    case .mint: return .mint
    }
  }

  var uiColor: UIColor {
    switch self {
    case .indigo: return .systemIndigo
    case .blue: return .systemBlue
    case .purple: return .systemPurple
    case .pink: return .systemPink
    case .red: return .systemRed
    case .orange: return .systemOrange
    case .green: return .systemGreen
    case .teal: return .systemTeal
    case .cyan: return .systemCyan
    case .mint: return .systemMint
    }
  }

  /// Secondary color that pairs well with this accent
  var secondaryColor: Color {
    switch self {
    case .indigo: return .purple
    case .blue: return .cyan
    case .purple: return .pink
    case .pink: return .purple
    case .red: return .orange
    case .orange: return .yellow
    case .green: return .mint
    case .teal: return .green
    case .cyan: return .blue
    case .mint: return .teal
    }
  }
}

// MARK: - Map Style Option

/// Map display style options
enum MapStyleOption: String, CaseIterable, Identifiable {
  case standard = "standard"
  case satellite = "satellite"
  case hybrid = "hybrid"
  case followTheme = "followTheme"

  var id: String { rawValue }

  var displayName: String {
    switch self {
    case .standard: return "map.style.standard".localized
    case .satellite: return "map.style.satellite".localized
    case .hybrid: return "map.style.hybrid".localized
    case .followTheme: return "map.style.followTheme".localized
    }
  }

  var icon: String {
    switch self {
    case .standard: return "map"
    case .satellite: return "globe.americas"
    case .hybrid: return "map.circle"
    case .followTheme: return "circle.lefthalf.filled"
    }
  }

  /// Get MapKit MapStyle for given color scheme
  func mapStyle(for colorScheme: ColorScheme) -> MapStyle {
    switch self {
    case .standard:
      return .standard(elevation: .realistic, pointsOfInterest: .all)
    case .satellite:
      return .imagery(elevation: .realistic)
    case .hybrid:
      return .hybrid(elevation: .realistic, pointsOfInterest: .all)
    case .followTheme:
      return colorScheme == .dark
        ? .standard(elevation: .realistic, pointsOfInterest: .all, showsTraffic: false)
        : .standard(elevation: .realistic, pointsOfInterest: .all)
    }
  }
}

// MARK: - Theme Manager

/// Manages the app's theme settings with UserDefaults persistence
@MainActor
@Observable
final class ThemeManager {
  // MARK: - Singleton

  static let shared = ThemeManager()

  // MARK: - Properties

  /// Current theme mode selected by the user
  private(set) var currentMode: ThemeMode = .system

  /// Current accent color selected by the user
  private(set) var accentColor: AccentColorOption = .indigo

  /// Current map style selected by the user
  private(set) var mapStyle: MapStyleOption = .followTheme

  /// Whether to use true black for OLED displays in dark mode
  private(set) var useTrueBlack: Bool = false

  /// Whether to reduce contrast in dark mode
  private(set) var reduceContrastInDark: Bool = false

  /// Keys for UserDefaults storage
  private let themeKey = "app_theme_mode"
  private let accentColorKey = "app_accent_color"
  private let mapStyleKey = "app_map_style"
  private let trueBlackKey = "app_true_black"
  private let reduceContrastKey = "app_reduce_contrast"

  // MARK: - Computed Properties

  /// Effective color scheme based on current mode and system setting
  var effectiveColorScheme: ColorScheme {
    switch currentMode {
    case .system:
      return UITraitCollection.current.userInterfaceStyle == .dark ? .dark : .light
    case .light:
      return .light
    case .dark:
      return .dark
    }
  }

  /// Whether the app is currently in dark mode
  var isDarkMode: Bool {
    effectiveColorScheme == .dark
  }

  /// Primary gradient using accent colors
  var primaryGradient: LinearGradient {
    LinearGradient(
      colors: [accentColor.color, accentColor.secondaryColor],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
  }

  /// Background color for OLED true black support
  var darkBackground: Color {
    useTrueBlack ? Color(white: 0.0) : Color(UIColor.systemBackground)
  }

  /// Secondary background for OLED true black support
  var darkSecondaryBackground: Color {
    useTrueBlack ? Color(white: 0.05) : Color(UIColor.secondarySystemBackground)
  }

  // MARK: - Initialization

  private init() {
    loadSettings()
  }

  // MARK: - Public Methods

  /// Set the theme mode and persist to UserDefaults
  func setTheme(_ mode: ThemeMode) {
    guard mode != currentMode else { return }

    currentMode = mode
    saveSettings()
    applyTheme()
    notifyThemeChange()
  }

  /// Set the accent color and persist to UserDefaults
  func setAccentColor(_ color: AccentColorOption) {
    guard color != accentColor else { return }

    accentColor = color
    saveSettings()
    applyAccentColor()
    notifyThemeChange()
  }

  /// Set the map style and persist to UserDefaults
  func setMapStyle(_ style: MapStyleOption) {
    guard style != mapStyle else { return }

    mapStyle = style
    saveSettings()
    notifyThemeChange()
  }

  /// Set true black mode for OLED displays
  func setTrueBlack(_ enabled: Bool) {
    guard enabled != useTrueBlack else { return }

    useTrueBlack = enabled
    saveSettings()
    notifyThemeChange()
  }

  /// Set reduce contrast mode
  func setReduceContrast(_ enabled: Bool) {
    guard enabled != reduceContrastInDark else { return }

    reduceContrastInDark = enabled
    saveSettings()
    notifyThemeChange()
  }

  /// Get MapStyle for current settings
  func currentMapStyle(for colorScheme: ColorScheme) -> MapStyle {
    mapStyle.mapStyle(for: colorScheme)
  }

  /// Apply the current theme to all windows
  func applyTheme() {
    let style = currentMode.userInterfaceStyle

    // Apply to all connected scenes
    for scene in UIApplication.shared.connectedScenes {
      guard let windowScene = scene as? UIWindowScene else { continue }
      for window in windowScene.windows {
        UIView.transition(
          with: window,
          duration: 0.3,
          options: [.transitionCrossDissolve, .allowUserInteraction],
          animations: {
            window.overrideUserInterfaceStyle = style
          }
        )
      }
    }
  }

  /// Apply theme without animation (for initial setup)
  func applyThemeImmediately() {
    let style = currentMode.userInterfaceStyle

    for scene in UIApplication.shared.connectedScenes {
      guard let windowScene = scene as? UIWindowScene else { continue }
      for window in windowScene.windows {
        window.overrideUserInterfaceStyle = style
      }
    }

    applyAccentColor()
  }

  /// Apply the accent color globally
  func applyAccentColor() {
    // Set the tint color for all windows
    for scene in UIApplication.shared.connectedScenes {
      guard let windowScene = scene as? UIWindowScene else { continue }
      for window in windowScene.windows {
        window.tintColor = accentColor.uiColor
      }
    }
  }

  /// Reset all theme settings to defaults
  func resetToDefaults() {
    currentMode = .system
    accentColor = .indigo
    mapStyle = .followTheme
    useTrueBlack = false
    reduceContrastInDark = false

    saveSettings()
    applyTheme()
    applyAccentColor()
    notifyThemeChange()
  }

  // MARK: - Private Methods

  private func loadSettings() {
    // Load theme mode
    if let savedMode = UserDefaults.standard.string(forKey: themeKey),
       let mode = ThemeMode(rawValue: savedMode) {
      currentMode = mode
    }

    // Load accent color
    if let savedColor = UserDefaults.standard.string(forKey: accentColorKey),
       let color = AccentColorOption(rawValue: savedColor) {
      accentColor = color
    }

    // Load map style
    if let savedStyle = UserDefaults.standard.string(forKey: mapStyleKey),
       let style = MapStyleOption(rawValue: savedStyle) {
      mapStyle = style
    }

    // Load boolean settings
    useTrueBlack = UserDefaults.standard.bool(forKey: trueBlackKey)
    reduceContrastInDark = UserDefaults.standard.bool(forKey: reduceContrastKey)
  }

  private func saveSettings() {
    UserDefaults.standard.set(currentMode.rawValue, forKey: themeKey)
    UserDefaults.standard.set(accentColor.rawValue, forKey: accentColorKey)
    UserDefaults.standard.set(mapStyle.rawValue, forKey: mapStyleKey)
    UserDefaults.standard.set(useTrueBlack, forKey: trueBlackKey)
    UserDefaults.standard.set(reduceContrastInDark, forKey: reduceContrastKey)
  }

  private func notifyThemeChange() {
    NotificationCenter.default.post(name: .themeDidChange, object: nil)
  }
}

// MARK: - Notification Extension

extension Notification.Name {
  static let themeDidChange = Notification.Name("themeDidChange")
}

// MARK: - Environment Key

/// Environment key for accessing the current color scheme override
struct ColorSchemeOverrideKey: EnvironmentKey {
  static let defaultValue: ColorScheme? = nil
}

extension EnvironmentValues {
  var colorSchemeOverride: ColorScheme? {
    get { self[ColorSchemeOverrideKey.self] }
    set { self[ColorSchemeOverrideKey.self] = newValue }
  }
}

// MARK: - Accent Color Environment Key

private struct AccentColorKey: EnvironmentKey {
  static let defaultValue: Color = .indigo
}

extension EnvironmentValues {
  var themeAccentColor: Color {
    get { self[AccentColorKey.self] }
    set { self[AccentColorKey.self] = newValue }
  }
}

// MARK: - View Modifier

/// View modifier to apply theme preference
struct ThemeModifier: ViewModifier {
  let themeManager: ThemeManager

  func body(content: Content) -> some View {
    content
      .preferredColorScheme(themeManager.currentMode.colorScheme)
      .tint(themeManager.accentColor.color)
      .environment(\.themeAccentColor, themeManager.accentColor.color)
  }
}

extension View {
  /// Apply the app's theme preference to this view hierarchy
  func withTheme(_ manager: ThemeManager = ThemeManager.shared) -> some View {
    modifier(ThemeModifier(themeManager: manager))
  }
}

// MARK: - Map Style Modifier

/// View modifier to apply map style based on theme
struct ThemedMapStyleModifier: ViewModifier {
  @Environment(\.colorScheme) private var colorScheme
  @Environment(ThemeManager.self) private var themeManager

  func body(content: Content) -> some View {
    content
  }
}

extension View {
  /// Get the appropriate MapStyle for current theme
  func themedMapStyle() -> some View {
    modifier(ThemedMapStyleModifier())
  }
}
