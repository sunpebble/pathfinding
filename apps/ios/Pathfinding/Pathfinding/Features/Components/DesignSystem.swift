import SwiftUI

// MARK: - Design Tokens

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
  }

  // MARK: - Corner Radius

  enum Radius {
    static let xs: CGFloat = 6
    static let sm: CGFloat = 10
    static let md: CGFloat = 14
    static let lg: CGFloat = 18
    static let xl: CGFloat = 24
    static let full: CGFloat = 9999
  }

  // MARK: - Shadows

  enum Shadow {
    static let sm = ShadowStyle(color: .black.opacity(0.04), radius: 4, y: 2)
    static let md = ShadowStyle(color: .black.opacity(0.08), radius: 8, y: 4)
    static let lg = ShadowStyle(color: .black.opacity(0.12), radius: 16, y: 6)
  }

  struct ShadowStyle {
    let color: Color
    let radius: CGFloat
    let y: CGFloat
  }
}

// MARK: - Color Extension

extension Color {
  static let accent = Color.indigo
  static let accentSecondary = Color.purple

  // Semantic colors
  static let aiPurple = Color.purple
  static let success = Color.green
  static let warning = Color.orange
  static let error = Color.red

  // Background gradients
  static var heroGradient: LinearGradient {
    LinearGradient(
      colors: [.indigo.opacity(0.15), .purple.opacity(0.1), .clear],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
  }

  static var cardGradient: LinearGradient {
    LinearGradient(
      colors: [.white.opacity(0.8), .white.opacity(0.4)],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
  }
}

// MARK: - View Extensions

extension View {
  /// Apply card styling with shadow
  func cardStyle(radius: CGFloat = DesignTokens.Radius.md) -> some View {
    self
      .background(.background)
      .clipShape(RoundedRectangle(cornerRadius: radius))
      .shadow(
        color: DesignTokens.Shadow.md.color,
        radius: DesignTokens.Shadow.md.radius,
        y: DesignTokens.Shadow.md.y
      )
  }

  /// Apply subtle card styling
  func subtleCardStyle(radius: CGFloat = DesignTokens.Radius.md) -> some View {
    self
      .background(.background)
      .clipShape(RoundedRectangle(cornerRadius: radius))
      .shadow(
        color: DesignTokens.Shadow.sm.color,
        radius: DesignTokens.Shadow.sm.radius,
        y: DesignTokens.Shadow.sm.y
      )
  }

  /// Glassmorphism effect
  func glassCard(radius: CGFloat = DesignTokens.Radius.md) -> some View {
    self
      .background(.ultraThinMaterial)
      .clipShape(RoundedRectangle(cornerRadius: radius))
  }
}

// MARK: - Custom Button Styles

struct PrimaryButtonStyle: ButtonStyle {
  @Environment(\.isEnabled) private var isEnabled

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.headline)
      .foregroundStyle(.white)
      .padding(.horizontal, DesignTokens.Spacing.lg)
      .padding(.vertical, DesignTokens.Spacing.sm)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .fill(isEnabled ? Color.accentColor : Color.gray)
      )
      .scaleEffect(configuration.isPressed ? 0.96 : 1)
      .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
  }
}

struct SecondaryButtonStyle: ButtonStyle {
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.subheadline)
      .fontWeight(.medium)
      .foregroundStyle(Color.accentColor)
      .padding(.horizontal, DesignTokens.Spacing.md)
      .padding(.vertical, DesignTokens.Spacing.xs)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.xs)
          .fill(Color.accentColor.opacity(0.1))
      )
      .scaleEffect(configuration.isPressed ? 0.96 : 1)
      .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
  }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
  static var primary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
  static var secondary: SecondaryButtonStyle { SecondaryButtonStyle() }
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
    HStack(spacing: 4) {
      if let icon {
        Image(systemName: icon)
      }
      Text(text)
    }
    .font(.caption2)
    .fontWeight(.semibold)
    .foregroundStyle(.white)
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(style.backgroundColor.gradient)
    .clipShape(Capsule())
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
    HStack(spacing: 3) {
      Image(systemName: icon)
        .foregroundStyle(color)
      Text(value)
    }
    .font(.caption)
    .foregroundStyle(.secondary)
  }
}

// MARK: - Preview

#Preview("Design System") {
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
          .buttonStyle(.primary)

        Button("Secondary Button") {}
          .buttonStyle(.secondary)
      }

      // Cards
      VStack(spacing: 12) {
        Text("Card Style")
          .padding()
          .frame(maxWidth: .infinity)
          .cardStyle()

        Text("Subtle Card")
          .padding()
          .frame(maxWidth: .infinity)
          .subtleCardStyle()

        Text("Glass Card")
          .padding()
          .frame(maxWidth: .infinity)
          .glassCard()
      }
      .padding(.horizontal)

      // Stats
      HStack(spacing: 16) {
        StatLabel(icon: "eye", value: "1.2k")
        StatLabel(icon: "heart.fill", value: "256", color: .red)
        StatLabel(icon: "bookmark.fill", value: "42", color: .orange)
      }
    }
    .padding()
  }
  .background(Color(.systemGroupedBackground))
}
