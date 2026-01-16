import SwiftUI

// MARK: - Direction Compass View

/// A compass view showing direction to target POI
struct ARDirectionCompass: View {
  let bearing: Double
  let deviceHeading: Double
  let distance: Double
  let poiName: String

  /// Relative bearing (0 = straight ahead)
  private var relativeBearing: Double {
    var relative = bearing - deviceHeading
    if relative < 0 { relative += 360 }
    if relative > 180 { relative -= 360 }
    return relative
  }

  /// Whether target is ahead (within 45 degrees)
  private var isAhead: Bool {
    abs(relativeBearing) < 45
  }

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      // Compass ring
      ZStack {
        // Background ring
        Circle()
          .stroke(Color.white.opacity(0.3), lineWidth: 3)
          .frame(width: 100, height: 100)

        // Direction arc
        Circle()
          .trim(from: 0, to: isAhead ? 0.25 : 0.15)
          .stroke(
            isAhead ? Color.green : Color.yellow,
            style: StrokeStyle(lineWidth: 4, lineCap: .round)
          )
          .frame(width: 100, height: 100)
          .rotationEffect(.degrees(relativeBearing - 45))

        // Arrow
        Image(systemName: "arrowtriangle.up.fill")
          .font(.title)
          .foregroundStyle(isAhead ? .green : .yellow)
          .rotationEffect(.degrees(relativeBearing))
          .animation(.spring(response: 0.3), value: relativeBearing)

        // Cardinal directions
        ForEach(["N", "E", "S", "W"], id: \.self) { direction in
          Text(direction)
            .font(.caption2)
            .fontWeight(.bold)
            .foregroundStyle(.white.opacity(0.6))
            .offset(y: -55)
            .rotationEffect(.degrees(cardinalOffset(for: direction)))
        }
      }
      .rotationEffect(.degrees(-deviceHeading))

      // Distance label
      VStack(spacing: 2) {
        Text(formattedDistance)
          .font(.title2)
          .fontWeight(.bold)
          .foregroundStyle(.white)

        Text(poiName)
          .font(.caption)
          .foregroundStyle(.white.opacity(0.8))
          .lineLimit(1)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
        .fill(.ultraThinMaterial)
    )
  }

  private var formattedDistance: String {
    if distance < 1000 {
      return String(format: "%.0f米", distance)
    } else {
      return String(format: "%.1f公里", distance / 1000)
    }
  }

  private func cardinalOffset(for direction: String) -> Double {
    switch direction {
    case "N": return 0
    case "E": return 90
    case "S": return 180
    case "W": return 270
    default: return 0
    }
  }
}

// MARK: - Direction Arrow View

/// An animated arrow pointing to target direction
struct ARDirectionArrow: View {
  let bearing: Double
  let deviceHeading: Double
  let isActive: Bool

  private var relativeBearing: Double {
    var relative = bearing - deviceHeading
    if relative < 0 { relative += 360 }
    if relative > 180 { relative -= 360 }
    return relative
  }

  @State private var isPulsing = false

  var body: some View {
    ZStack {
      // Pulse effect
      if isActive {
        Circle()
          .fill(Color.yellow.opacity(0.3))
          .frame(width: 80, height: 80)
          .scaleEffect(isPulsing ? 1.3 : 1.0)
          .opacity(isPulsing ? 0 : 0.5)
          .animation(
            .easeOut(duration: 1.5).repeatForever(autoreverses: false),
            value: isPulsing
          )
      }

      // Arrow background
      Circle()
        .fill(.ultraThinMaterial)
        .frame(width: 60, height: 60)

      // Arrow icon
      Image(systemName: "location.north.fill")
        .font(.title)
        .foregroundStyle(isActive ? .yellow : .white)
        .rotationEffect(.degrees(relativeBearing))
        .animation(.spring(response: 0.3), value: relativeBearing)
    }
    .onAppear {
      if isActive {
        isPulsing = true
      }
    }
    .onChange(of: isActive) { _, newValue in
      isPulsing = newValue
    }
  }
}

// MARK: - Distance Badge

/// A badge showing distance to POI
struct ARDistanceBadge: View {
  let distance: Double
  let style: DistanceStyle

  enum DistanceStyle {
    case large
    case medium
    case small
    case compact
  }

  private var formattedDistance: String {
    if distance < 1000 {
      return String(format: "%.0f", distance)
    } else {
      return String(format: "%.1f", distance / 1000)
    }
  }

  private var unit: String {
    distance < 1000 ? "米" : "公里"
  }

  private var distanceColor: Color {
    if distance < 50 {
      return .green
    } else if distance < 200 {
      return .yellow
    } else {
      return .white
    }
  }

  var body: some View {
    Group {
      switch style {
      case .large:
        largeStyle
      case .medium:
        mediumStyle
      case .small:
        smallStyle
      case .compact:
        compactStyle
      }
    }
  }

  private var largeStyle: some View {
    VStack(spacing: 4) {
      Text(formattedDistance)
        .font(.system(size: 48, weight: .bold, design: .rounded))
        .foregroundStyle(distanceColor)

      Text(unit)
        .font(.headline)
        .foregroundStyle(.white.opacity(0.8))
    }
    .padding(DesignTokens.Spacing.lg)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
        .fill(.ultraThinMaterial)
    )
  }

  private var mediumStyle: some View {
    HStack(spacing: 4) {
      Text(formattedDistance)
        .font(.title)
        .fontWeight(.bold)
        .foregroundStyle(distanceColor)

      Text(unit)
        .font(.subheadline)
        .foregroundStyle(.white.opacity(0.8))
    }
    .padding(.horizontal, DesignTokens.Spacing.md)
    .padding(.vertical, DesignTokens.Spacing.sm)
    .background(
      Capsule()
        .fill(.ultraThinMaterial)
    )
  }

  private var smallStyle: some View {
    HStack(spacing: 2) {
      Text(formattedDistance)
        .font(.subheadline)
        .fontWeight(.semibold)
        .foregroundStyle(distanceColor)

      Text(unit)
        .font(.caption)
        .foregroundStyle(.white.opacity(0.8))
    }
    .padding(.horizontal, DesignTokens.Spacing.sm)
    .padding(.vertical, 4)
    .background(
      Capsule()
        .fill(.ultraThinMaterial)
    )
  }

  private var compactStyle: some View {
    Text("\(formattedDistance)\(unit)")
      .font(.caption)
      .fontWeight(.medium)
      .foregroundStyle(distanceColor)
      .padding(.horizontal, 6)
      .padding(.vertical, 2)
      .background(
        Capsule()
          .fill(.black.opacity(0.5))
      )
  }
}

// MARK: - Route Progress Indicator

/// Shows progress through the route
struct ARRouteProgressIndicator: View {
  let currentIndex: Int
  let totalCount: Int
  let pois: [ARPoi]

  private var progress: Double {
    guard totalCount > 0 else { return 0 }
    return Double(currentIndex) / Double(totalCount)
  }

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      // Progress bar
      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          // Background
          Capsule()
            .fill(Color.white.opacity(0.3))
            .frame(height: 6)

          // Progress
          Capsule()
            .fill(Color.green)
            .frame(width: geometry.size.width * progress, height: 6)

          // POI markers
          HStack(spacing: 0) {
            ForEach(0..<totalCount, id: \.self) { index in
              Circle()
                .fill(index <= currentIndex ? Color.green : Color.white.opacity(0.5))
                .frame(width: 10, height: 10)

              if index < totalCount - 1 {
                Spacer()
              }
            }
          }
        }
      }
      .frame(height: 10)

      // Labels
      HStack {
        if currentIndex < pois.count {
          Text(pois[currentIndex].name)
            .font(.caption)
            .foregroundStyle(.white)
            .lineLimit(1)
        }

        Spacer()

        Text("\(currentIndex + 1)/\(totalCount)")
          .font(.caption)
          .fontWeight(.medium)
          .foregroundStyle(.white.opacity(0.8))
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(.ultraThinMaterial)
    )
  }
}

// MARK: - AR Arrival Celebration

/// Celebration view shown when arriving at POI
struct ARArivalCelebration: View {
  let poiName: String
  let onContinue: () -> Void

  @State private var isAnimating = false

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      // Checkmark animation
      ZStack {
        Circle()
          .fill(Color.green.opacity(0.2))
          .frame(width: 120, height: 120)
          .scaleEffect(isAnimating ? 1.2 : 0.8)
          .opacity(isAnimating ? 0 : 1)
          .animation(
            .easeOut(duration: 1).repeatForever(autoreverses: false),
            value: isAnimating
          )

        Circle()
          .fill(Color.green)
          .frame(width: 80, height: 80)

        Image(systemName: "checkmark")
          .font(.system(size: 40, weight: .bold))
          .foregroundStyle(.white)
      }

      VStack(spacing: DesignTokens.Spacing.xs) {
        Text("已到达")
          .font(.headline)
          .foregroundStyle(.white)

        Text(poiName)
          .font(.title2)
          .fontWeight(.bold)
          .foregroundStyle(.white)
          .multilineTextAlignment(.center)
      }

      Button {
        onContinue()
      } label: {
        Text("继续导航")
          .font(.headline)
          .foregroundStyle(.white)
          .frame(maxWidth: .infinity)
          .padding()
          .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
              .fill(Color.accentColor)
          )
      }
      .padding(.horizontal, DesignTokens.Spacing.xl)
    }
    .padding(DesignTokens.Spacing.xl)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.xl)
        .fill(.ultraThinMaterial)
    )
    .onAppear {
      isAnimating = true
    }
  }
}

// MARK: - AR HUD View

/// Heads-up display for AR navigation
struct ARHUDView: View {
  let poi: ARPoi
  let deviceHeading: Double

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.lg) {
      // Direction compass
      ARDirectionArrow(
        bearing: poi.bearing,
        deviceHeading: deviceHeading,
        isActive: true
      )

      // Info
      VStack(alignment: .leading, spacing: 4) {
        Text(poi.name)
          .font(.headline)
          .foregroundStyle(.white)
          .lineLimit(1)

        HStack(spacing: DesignTokens.Spacing.sm) {
          ARDistanceBadge(distance: poi.distance, style: .small)

          Text(poi.cardinalDirection)
            .font(.caption)
            .foregroundStyle(.white.opacity(0.7))
        }
      }

      Spacer()
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(.ultraThinMaterial)
    )
  }
}

// MARK: - Previews

#Preview("Direction Compass") {
  ZStack {
    Color.black.ignoresSafeArea()

    ARDirectionCompass(
      bearing: 45,
      deviceHeading: 0,
      distance: 350,
      poiName: "东京塔"
    )
  }
}

#Preview("Distance Badges") {
  ZStack {
    Color.black.ignoresSafeArea()

    VStack(spacing: 20) {
      ARDistanceBadge(distance: 42, style: .large)
      ARDistanceBadge(distance: 350, style: .medium)
      ARDistanceBadge(distance: 1250, style: .small)
      ARDistanceBadge(distance: 2500, style: .compact)
    }
  }
}

#Preview("Arrival Celebration") {
  ZStack {
    Color.black.ignoresSafeArea()

    ARArivalCelebration(poiName: "浅草寺") {}
  }
}
