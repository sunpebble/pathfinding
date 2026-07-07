import SwiftUI
import UIKit

// MARK: - Design Tokens
// 探索者设计系统 - Explorer Design System for Travel Planning App

enum DesignTokens {
  // MARK: - Spacing

  enum Spacing {
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 20
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
    static let jumbo: CGFloat = 64
    static let mega: CGFloat = 80
  }

  // MARK: - Corner Radius

  enum Radius {
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 6
    static let sm: CGFloat = 10
    static let md: CGFloat = 14
    static let lg: CGFloat = 18
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 40
    static let full: CGFloat = 9999
  }

  // MARK: - Shadows (Adaptive for Dark Mode - Apple Native Style)

  enum Shadow {
    /// Subtle shadow - barely visible, for minimal elevation (Apple native style)
    static func subtle(for colorScheme: ColorScheme) -> ShadowStyle {
      colorScheme == .dark
        ? ShadowStyle(color: .clear, radius: 0, y: 0)
        : ShadowStyle(color: .black.opacity(0.03), radius: 2, y: 1)
    }

    /// Small shadow - light elevation for cards (Apple native style)
    static func sm(for colorScheme: ColorScheme) -> ShadowStyle {
      colorScheme == .dark
        ? ShadowStyle(color: .black.opacity(0.3), radius: 2, y: 1)
        : ShadowStyle(color: .black.opacity(0.04), radius: 4, y: 2)
    }

    /// Medium shadow - moderate elevation for floating elements
    static func md(for colorScheme: ColorScheme) -> ShadowStyle {
      colorScheme == .dark
        ? ShadowStyle(color: .black.opacity(0.4), radius: 4, y: 2)
        : ShadowStyle(color: .black.opacity(0.06), radius: 6, y: 3)
    }

    /// Large shadow - prominent elevation for modals and popovers
    static func lg(for colorScheme: ColorScheme) -> ShadowStyle {
      colorScheme == .dark
        ? ShadowStyle(color: .black.opacity(0.5), radius: 8, y: 4)
        : ShadowStyle(color: .black.opacity(0.08), radius: 10, y: 4)
    }

    /// Glow effect for dark mode (colored shadow)
    static func glow(color: Color, for colorScheme: ColorScheme) -> ShadowStyle {
      colorScheme == .dark
        ? ShadowStyle(color: color.opacity(0.4), radius: 12, y: 0)
        : ShadowStyle(color: color.opacity(0.2), radius: 8, y: 2)
    }

    // Static versions for backward compatibility
    static let subtle = ShadowStyle(color: .black.opacity(0.03), radius: 2, y: 1)
    static let sm = ShadowStyle(color: .black.opacity(0.04), radius: 4, y: 2)
    static let md = ShadowStyle(color: .black.opacity(0.06), radius: 6, y: 3)
    static let lg = ShadowStyle(color: .black.opacity(0.08), radius: 10, y: 4)
  }

  struct ShadowStyle {
    let color: Color
    let radius: CGFloat
    let y: CGFloat
  }

  // MARK: - Animation

  enum Animation {
    static let quick = SwiftUI.Animation.easeOut(duration: 0.15)
    static let standard = SwiftUI.Animation.easeInOut(duration: 0.25)
    static let smooth = SwiftUI.Animation.easeInOut(duration: 0.35)
    static let spring = SwiftUI.Animation.spring(response: 0.3, dampingFraction: 0.7)
    static let bouncy = SwiftUI.Animation.spring(response: 0.4, dampingFraction: 0.6)

    // Reduced Motion variants — instant transitions
    static let quickReduced = SwiftUI.Animation.easeOut(duration: 0)
    static let standardReduced = SwiftUI.Animation.easeInOut(duration: 0)
    static let smoothReduced = SwiftUI.Animation.easeInOut(duration: 0)
    static let springReduced = SwiftUI.Animation.easeOut(duration: 0.1)
    static let bouncyReduced = SwiftUI.Animation.easeOut(duration: 0.1)

    /// Returns the appropriate animation based on Reduce Motion setting
    static func adaptive(_ animation: SwiftUI.Animation, reduceMotion: Bool) -> SwiftUI.Animation? {
      reduceMotion ? nil : animation
    }
  }

  // MARK: - Typography

  enum Typography {
    static let largeTitle: Font = .largeTitle
    static let title: Font = .title
    static let title2: Font = .title2
    static let title3: Font = .title3
    static let headline: Font = .headline
    static let body: Font = .body
    static let callout: Font = .callout
    static let subheadline: Font = .subheadline
    static let footnote: Font = .footnote
    static let caption: Font = .caption
    static let caption2: Font = .caption2

    /// Scales a custom font size using UIFontMetrics, capped at maxSize
    private static func scaled(_ baseSize: CGFloat, maxSize: CGFloat) -> CGFloat {
      min(UIFontMetrics.default.scaledValue(for: baseSize), maxSize)
    }

    // MARK: - Display Fonts (探索者英雄字体)

    enum Display {
      static var compact: Font { .system(size: scaled(28, maxSize: 38), weight: .bold, design: .rounded) }

      private static func scaled(_ base: CGFloat, maxSize: CGFloat) -> CGFloat {
        Typography.scaled(base, maxSize: maxSize)
      }
    }

    // MARK: - Map Legend Fonts (地图图例字体)

    enum MapLegend {
      static var duration: Font { .system(size: scaled(13, maxSize: 20), weight: .bold, design: .rounded) }

      private static func scaled(_ base: CGFloat, maxSize: CGFloat) -> CGFloat {
        Typography.scaled(base, maxSize: maxSize)
      }
    }
  }

  // MARK: - Semantic Colors (Adaptive for Light/Dark Mode)

  enum Colors {
    // MARK: - Background Colors

    /// Primary background color
    static var background: Color {
      Color(.systemBackground)
    }

    /// Secondary background color (slightly elevated)
    static var backgroundSecondary: Color {
      Color(.secondarySystemBackground)
    }

    /// Tertiary background color (more elevated)
    static var backgroundTertiary: Color {
      Color(.tertiarySystemBackground)
    }

    /// Grouped background color
    static var backgroundGrouped: Color {
      Color(.systemGroupedBackground)
    }

    /// Card background color
    static var cardBackground: Color {
      Color(.secondarySystemBackground)
    }

    /// Elevated background for dark mode cards
    static func elevatedBackground(for colorScheme: ColorScheme) -> Color {
      colorScheme == .dark
        ? Color(UIColor.secondarySystemBackground)
        : Color(UIColor.systemBackground)
    }

    // MARK: - Surface Colors

    /// Elevated surface (for cards, modals)
    static var surfaceElevated: Color {
      Color(.secondarySystemBackground)
    }

    /// Overlay background (semi-transparent)
    static var overlay: Color {
      Color(.systemFill)
    }

    /// Dark overlay for modals
    static func modalOverlay(for colorScheme: ColorScheme) -> Color {
      colorScheme == .dark
        ? Color.black.opacity(0.7)
        : Color.black.opacity(0.4)
    }

    // MARK: - Text Colors

    /// Primary text color
    static var textPrimary: Color {
      Color(.label)
    }

    /// Secondary text color
    static var textSecondary: Color {
      Color(.secondaryLabel)
    }

    /// Tertiary text color
    static var textTertiary: Color {
      Color(.tertiaryLabel)
    }

    /// Quaternary text color (most subtle)
    static var textQuaternary: Color {
      Color(.quaternaryLabel)
    }

    /// Inverted text (for colored backgrounds)
    static var textInverted: Color {
      .white
    }

    // MARK: - Border & Separator Colors

    /// Standard separator color
    static var separator: Color {
      Color(.separator)
    }

    /// Opaque separator color
    static var separatorOpaque: Color {
      Color(.opaqueSeparator)
    }

    /// Border color for inputs and cards
    static var border: Color {
      Color(.systemGray4)
    }

    /// Subtle border for dark mode cards
    static func cardBorder(for colorScheme: ColorScheme) -> Color {
      colorScheme == .dark
        ? Color.white.opacity(0.08)
        : Color.black.opacity(0.05)
    }

    // MARK: - Fill Colors

    /// Primary fill color
    static var fill: Color {
      Color(.systemFill)
    }

    /// Secondary fill color
    static var fillSecondary: Color {
      Color(.secondarySystemFill)
    }

    /// Tertiary fill color
    static var fillTertiary: Color {
      Color(.tertiarySystemFill)
    }

    /// Quaternary fill color
    static var fillQuaternary: Color {
      Color(.quaternarySystemFill)
    }

    // MARK: - Accent Colors (Dynamic based on ThemeManager)

    /// Primary accent color - uses ThemeManager's accent
    @MainActor static var accent: Color {
      ThemeManager.shared.accentColor.color
    }

    /// Secondary accent color - pairs with primary
    @MainActor static var accentSecondary: Color {
      ThemeManager.shared.accentColor.secondaryColor
    }

    /// AI-related features
    static var aiPurple: Color {
      .purple
    }

    /// Get accent color with opacity for backgrounds
    @MainActor static func accentBackground(opacity: Double = 0.1, for colorScheme: ColorScheme) -> Color {
      colorScheme == .dark
        ? accent.opacity(opacity * 1.5)
        : accent.opacity(opacity)
    }

    // MARK: - Semantic State Colors

    static var success: Color { .green }
    static var warning: Color { .orange }
    static var error: Color { .red }
    static var info: Color { .blue }

    // MARK: - Terrain Colors (地形主题色)

    enum Terrain {
      static let forest: Color = Color(red: 0.18, green: 0.49, blue: 0.20)
      static let forestLight: Color = Color(red: 0.56, green: 0.73, blue: 0.56)
      static let desert: Color = Color(red: 0.82, green: 0.69, blue: 0.47)
      static let desertLight: Color = Color(red: 0.93, green: 0.87, blue: 0.73)
      static let ocean: Color = Color(red: 0.15, green: 0.42, blue: 0.67)
      static let oceanLight: Color = Color(red: 0.53, green: 0.72, blue: 0.87)
      static let mountain: Color = Color(red: 0.45, green: 0.45, blue: 0.52)
      static let mountainLight: Color = Color(red: 0.73, green: 0.73, blue: 0.78)
      static let glacier: Color = Color(red: 0.75, green: 0.88, blue: 0.93)
      static let volcano: Color = Color(red: 0.70, green: 0.25, blue: 0.18)
      static let grassland: Color = Color(red: 0.55, green: 0.76, blue: 0.29)
      static let canyon: Color = Color(red: 0.76, green: 0.42, blue: 0.27)
    }

    // MARK: - Gradients

    /// Card gradient
    static func cardGradient(for colorScheme: ColorScheme) -> LinearGradient {
      colorScheme == .dark
        ? LinearGradient(
            colors: [Color(.systemGray5).opacity(0.6), Color(.systemGray6).opacity(0.3)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
        : LinearGradient(
            colors: [.white.opacity(0.9), .white.opacity(0.5)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
    }

    /// Primary gradient (uses current accent colors)
    @available(*, deprecated, message: "iOS 26: accent via .tint; glass via .glassEffect(.regular.tint(...))")
    @MainActor static var primaryGradient: LinearGradient {
      LinearGradient(
        colors: [ThemeManager.shared.accentColor.color, ThemeManager.shared.accentColor.secondaryColor],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    }

    /// Subtle background gradient for sections
    static func sectionGradient(for colorScheme: ColorScheme) -> LinearGradient {
      colorScheme == .dark
        ? LinearGradient(
            colors: [Color(.systemGray6).opacity(0.5), Color(.systemGray6).opacity(0.2)],
            startPoint: .top,
            endPoint: .bottom
          )
        : LinearGradient(
            colors: [Color(.systemGray6).opacity(0.3), Color(.systemGray6).opacity(0.1)],
            startPoint: .top,
            endPoint: .bottom
          )
    }

    // MARK: - Placeholder Colors

    /// Image placeholder background
    static func imagePlaceholder(for colorScheme: ColorScheme) -> Color {
      colorScheme == .dark
        ? Color(.systemGray4)
        : Color(.systemGray5)
    }

    /// Shimmer base color
    static func shimmerBase(for colorScheme: ColorScheme) -> Color {
      colorScheme == .dark
        ? Color(.systemGray5)
        : Color(.systemGray6)
    }

    /// Shimmer highlight color
    static func shimmerHighlight(for colorScheme: ColorScheme) -> Color {
      colorScheme == .dark
        ? Color(.systemGray4)
        : Color(.systemGray5)
    }

    // MARK: - Map Colors

    /// Map route line color
    @MainActor static func mapRouteLine(for colorScheme: ColorScheme) -> Color {
      colorScheme == .dark
        ? accent.opacity(0.8)
        : accent.opacity(0.6)
    }

    /// Map marker background
    static func mapMarkerBackground(for colorScheme: ColorScheme) -> Color {
      colorScheme == .dark
        ? Color(.systemGray5)
        : .white
    }
  }
}

// MARK: - Color Extension

extension Color {
  // MARK: - Dynamic Accent Colors (from ThemeManager)

  /// Primary accent color - uses ThemeManager's accent
  @MainActor static var themeAccent: Color {
    ThemeManager.shared.accentColor.color
  }

  /// Secondary accent color - pairs with primary
  @MainActor static var themeAccentSecondary: Color {
    ThemeManager.shared.accentColor.secondaryColor
  }

  // MARK: - Semantic Colors

  static let aiPurple = Color.purple
  static let success = Color.green
  static let warning = Color.orange
  static let error = Color.red

  // MARK: - Background Gradients

  static var cardGradient: LinearGradient {
    LinearGradient(
      colors: [.white.opacity(0.8), .white.opacity(0.4)],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
  }

  /// Gradient that adapts to color scheme
  static func adaptiveCardGradient(for colorScheme: ColorScheme) -> LinearGradient {
    DesignTokens.Colors.cardGradient(for: colorScheme)
  }

  // MARK: - Hex Color Initialization

  /// Initialize Color from hex string (e.g., "#FF5733" or "FF5733")
  init?(hex: String) {
    var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

    var rgb: UInt64 = 0
    var alpha: Double = 1.0

    guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else {
      return nil
    }

    let length = hexSanitized.count
    if length == 8 {
      alpha = Double((rgb & 0xFF00_0000) >> 24) / 255.0
      rgb = rgb & 0x00FF_FFFF
    }

    let red = Double((rgb & 0xFF0000) >> 16) / 255.0
    let green = Double((rgb & 0x00FF00) >> 8) / 255.0
    let blue = Double(rgb & 0x0000FF) / 255.0

    self.init(red: red, green: green, blue: blue, opacity: alpha)
  }

  /// Convert Color to hex string
  var hexString: String {
    guard let components = UIColor(self).cgColor.components else { return "#FFFFFF" }
    let r = Int(components[0] * 255)
    let g = Int(components.count > 1 ? components[1] * 255 : components[0] * 255)
    let b = Int(components.count > 2 ? components[2] * 255 : components[0] * 255)
    return String(format: "#%02X%02X%02X", r, g, b)
  }
}

// MARK: - View Extensions

extension View {
  /// 唯一玻璃卡片表面(iOS 26)。在 padding/frame 之后调用。
  /// - 仅用于自由悬浮表面;List/Form 行不要再套(避免玻璃叠玻璃)。
  /// - tint 仅用于"选中 / 主操作"强调,信息卡传 nil。
  func cardSurface(tint: Color? = nil, cornerRadius: CGFloat = DesignTokens.Radius.lg) -> some View {
    let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
    return self.glassEffect(
      tint.map { Glass.regular.tint($0) } ?? Glass.regular,
      in: shape
    )
  }

  /// Apply card styling with adaptive shadow for color scheme
  @available(*, deprecated, message: "iOS 26: use cardSurface(tint:) backed by system glass")
  func adaptiveCardStyle(radius: CGFloat = DesignTokens.Radius.md, colorScheme: ColorScheme) -> some View {
    let shadow = DesignTokens.Shadow.md(for: colorScheme)
    let border = DesignTokens.Colors.cardBorder(for: colorScheme)
    return self
      .background(DesignTokens.Colors.cardBackground)
      .clipShape(RoundedRectangle(cornerRadius: radius))
      .overlay(
        RoundedRectangle(cornerRadius: radius)
          .stroke(border, lineWidth: colorScheme == .dark ? 0.5 : 0)
      )
      .shadow(color: shadow.color, radius: shadow.radius, y: shadow.y)
  }

  /// Dark mode optimized card with glow effect
  @available(*, deprecated, message: "iOS 26: use cardSurface(tint:) backed by system glass")
  func glowCardStyle(color: Color, radius: CGFloat = DesignTokens.Radius.md, colorScheme: ColorScheme) -> some View {
    let shadow = DesignTokens.Shadow.glow(color: color, for: colorScheme)
    return self
      .background(DesignTokens.Colors.cardBackground)
      .clipShape(RoundedRectangle(cornerRadius: radius))
      .shadow(color: shadow.color, radius: shadow.radius, y: shadow.y)
  }

  /// Bordered card style (good for dark mode)
  @available(*, deprecated, message: "iOS 26: use cardSurface(tint:) backed by system glass")
  func borderedCardStyle(radius: CGFloat = DesignTokens.Radius.md, colorScheme: ColorScheme) -> some View {
    let border = DesignTokens.Colors.cardBorder(for: colorScheme)
    return self
      .background(DesignTokens.Colors.elevatedBackground(for: colorScheme))
      .clipShape(RoundedRectangle(cornerRadius: radius))
      .overlay(
        RoundedRectangle(cornerRadius: radius)
          .stroke(border, lineWidth: 1)
      )
  }

  /// Apply Apple-native shadow with automatic color scheme adaptation
  func appleShadow(_ level: ShadowLevel = .sm) -> some View {
    modifier(AppleShadowModifier(level: level))
  }

  /// Apply animation that respects Reduce Motion accessibility setting
  func adaptiveAnimation(_ animation: Animation = DesignTokens.Animation.standard, value: some Hashable) -> some View {
    modifier(AdaptiveAnimationModifier(animation: animation, trigger: AnyHashableEquatable(value)))
  }

  /// Ensure minimum 44x44pt touch target for small interactive elements
  func minimumTouchTarget() -> some View {
    self
      .frame(minWidth: 44, minHeight: 44)
      .contentShape(Rectangle())
  }
}

// MARK: - Shadow Level

enum ShadowLevel {
  case subtle
  case sm
  case md
  case lg
}

// MARK: - Apple Shadow Modifier

struct AppleShadowModifier: ViewModifier {
  @Environment(\.colorScheme) private var colorScheme
  let level: ShadowLevel

  func body(content: Content) -> some View {
    let shadow: DesignTokens.ShadowStyle
    switch level {
    case .subtle:
      shadow = DesignTokens.Shadow.subtle(for: colorScheme)
    case .sm:
      shadow = DesignTokens.Shadow.sm(for: colorScheme)
    case .md:
      shadow = DesignTokens.Shadow.md(for: colorScheme)
    case .lg:
      shadow = DesignTokens.Shadow.lg(for: colorScheme)
    }
    return content.shadow(color: shadow.color, radius: shadow.radius, y: shadow.y)
  }
}

// MARK: - Adaptive Animation Modifier

fileprivate struct AnyHashableEquatable: Equatable {
  let value: AnyHashable
  init<T: Hashable>(_ value: T) { self.value = AnyHashable(value) }
}

fileprivate struct AdaptiveAnimationModifier: ViewModifier {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  let animation: Animation
  let trigger: AnyHashableEquatable

  func body(content: Content) -> some View {
    content.animation(reduceMotion ? nil : animation, value: trigger)
  }
}

// MARK: - Badge Component

struct Badge: View {
  let text: String
  let icon: String?
  let style: BadgeStyle

  enum BadgeStyle {
    case ai
    case info
    case success
    case warning

    var backgroundColor: Color {
      switch self {
      case .ai: return .purple
      case .info: return .blue
      case .success: return .green
      case .warning: return .orange
      }
    }
  }

  init(_ text: String, icon: String? = nil, style: BadgeStyle = .info) {
    self.text = text
    self.icon = icon
    self.style = style
  }

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.xxs) {
      if let icon {
        Image(systemName: icon)
      }
      Text(text)
    }
    .font(.caption2)
    .fontWeight(.semibold)
    .foregroundStyle(.white)
    .padding(.horizontal, DesignTokens.Spacing.xs)
    .padding(.vertical, DesignTokens.Spacing.xxs)
    .background(style.backgroundColor.gradient)
    .clipShape(Capsule())
    .accessibilityLabel("\(text)")
  }
}

// MARK: - Stat Label Component

struct StatLabel: View {
  let icon: String
  let value: String
  let color: Color

  init(icon: String, value: String, color: Color = .secondary) {
    self.icon = icon
    self.value = value
    self.color = color
  }

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.xxs) {
      Image(systemName: icon)
        .foregroundStyle(color)
      Text(value)
    }
    .font(.caption)
    .foregroundStyle(.secondary)
    .accessibilityElement(children: .combine)
  }
}

// MARK: - Preview

#Preview("Design System - Light") {
  ScrollView {
    VStack(spacing: 24) {
      // Badges
      HStack(spacing: 12) {
        Badge("AI", icon: "sparkles", style: .ai)
        Badge("New", style: .info)
        Badge("Hot", style: .warning)
      }

      // Buttons
      VStack(spacing: 12) {
        Button("Primary Button") {}
          .buttonStyle(.glassProminent)

        Button("Secondary Button") {}
          .buttonStyle(.glass)
      }

      // Cards
      VStack(spacing: 12) {
        Text("Card Surface")
          .padding()
          .frame(maxWidth: .infinity)
          .cardSurface()

        Text("Tinted Card Surface")
          .padding()
          .frame(maxWidth: .infinity)
          .cardSurface(tint: .accentColor.opacity(0.3))
      }
      .padding(.horizontal)

      // Stats
      HStack(spacing: 16) {
        StatLabel(icon: "eye", value: "1.2k")
        StatLabel(icon: "heart.fill", value: "256", color: .red)
        StatLabel(icon: "bookmark.fill", value: "42", color: .orange)
      }

      // Theme Colors
      VStack(alignment: .leading, spacing: 8) {
        Text("Semantic Colors")
          .font(.headline)

        HStack(spacing: 8) {
          ColorSwatch(color: DesignTokens.Colors.accent, name: "Accent")
          ColorSwatch(color: DesignTokens.Colors.success, name: "Success")
          ColorSwatch(color: DesignTokens.Colors.warning, name: "Warning")
          ColorSwatch(color: DesignTokens.Colors.error, name: "Error")
        }
      }
      .padding(.horizontal)
    }
    .padding()
  }
  .background(DesignTokens.Colors.backgroundGrouped)
  .preferredColorScheme(.light)
}

#Preview("Design System - Dark") {
  ScrollView {
    VStack(spacing: 24) {
      // Badges
      HStack(spacing: 12) {
        Badge("AI", icon: "sparkles", style: .ai)
        Badge("New", style: .info)
        Badge("Hot", style: .warning)
      }

      // Buttons
      VStack(spacing: 12) {
        Button("Primary Button") {}
          .buttonStyle(.glassProminent)

        Button("Secondary Button") {}
          .buttonStyle(.glass)
      }

      // Cards
      VStack(spacing: 12) {
        Text("Card Surface")
          .padding()
          .frame(maxWidth: .infinity)
          .cardSurface()

        Text("Tinted Card Surface")
          .padding()
          .frame(maxWidth: .infinity)
          .cardSurface(tint: .accentColor.opacity(0.3))
      }
      .padding(.horizontal)

      // Stats
      HStack(spacing: 16) {
        StatLabel(icon: "eye", value: "1.2k")
        StatLabel(icon: "heart.fill", value: "256", color: .red)
        StatLabel(icon: "bookmark.fill", value: "42", color: .orange)
      }

      // Theme Colors
      VStack(alignment: .leading, spacing: 8) {
        Text("Semantic Colors")
          .font(.headline)

        HStack(spacing: 8) {
          ColorSwatch(color: DesignTokens.Colors.accent, name: "Accent")
          ColorSwatch(color: DesignTokens.Colors.success, name: "Success")
          ColorSwatch(color: DesignTokens.Colors.warning, name: "Warning")
          ColorSwatch(color: DesignTokens.Colors.error, name: "Error")
        }
      }
      .padding(.horizontal)
    }
    .padding()
  }
  .background(DesignTokens.Colors.backgroundGrouped)
  .preferredColorScheme(.dark)
}

#Preview("cardSurface") {
  VStack(spacing: 16) {
    Text("Info card").padding().frame(maxWidth: .infinity).cardSurface()
    Text("Selected").padding().frame(maxWidth: .infinity)
      .cardSurface(tint: .accentColor.opacity(0.3))
  }
  .padding()
  .background(Color(.systemGroupedBackground))
}

// MARK: - Color Swatch Helper

private struct ColorSwatch: View {
  let color: Color
  let name: String

  var body: some View {
    VStack(spacing: 4) {
      RoundedRectangle(cornerRadius: 8)
        .fill(color)
        .frame(width: 50, height: 50)

      Text(name)
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
  }
}
