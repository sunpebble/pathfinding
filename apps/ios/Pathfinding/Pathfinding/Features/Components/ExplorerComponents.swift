import SwiftUI

// MARK: - Explorer Section Header (探索者区块标题)

struct ExplorerSectionHeader: View {
  let title: String
  let subtitle: String?
  let icon: String?
  let accentColor: Color
  let action: (() -> Void)?

  @Environment(\.colorScheme) private var colorScheme

  init(
    _ title: String,
    subtitle: String? = nil,
    icon: String? = nil,
    accentColor: Color = DesignTokens.Colors.accent,
    action: (() -> Void)? = nil
  ) {
    self.title = title
    self.subtitle = subtitle
    self.icon = icon
    self.accentColor = accentColor
    self.action = action
  }

  var body: some View {
    HStack(alignment: .center, spacing: DesignTokens.Spacing.sm) {
      if let icon = icon {
        Image(systemName: icon)
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(accentColor)
          .frame(width: 28, height: 28)
          .background(accentColor.opacity(colorScheme == .dark ? 0.2 : 0.12))
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))
      }

      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(DesignTokens.Typography.Card.title)
          .foregroundStyle(.primary)

        if let subtitle = subtitle {
          Text(subtitle)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      Spacer()

      if let action = action {
        Button(action: action) {
          HStack(spacing: 4) {
            Text("查看全部")
              .font(.caption)
            Image(systemName: "chevron.right")
              .font(.caption2)
          }
          .foregroundStyle(accentColor)
        }
      }
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }
}

// MARK: - Destination Badge (目的地徽章)

struct DestinationBadge: View {
  let destination: String
  let size: Size
  let showIcon: Bool

  @Environment(\.colorScheme) private var colorScheme

  enum Size {
    case small, medium, large

    var font: Font {
      switch self {
      case .small: return .caption2
      case .medium: return .caption
      case .large: return .subheadline
      }
    }

    var iconSize: CGFloat {
      switch self {
      case .small: return 10
      case .medium: return 12
      case .large: return 14
      }
    }

    var padding: EdgeInsets {
      switch self {
      case .small: return EdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8)
      case .medium: return EdgeInsets(top: 6, leading: 10, bottom: 6, trailing: 10)
      case .large: return EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12)
      }
    }
  }

  private var terrainColor: Color {
    DesignTokens.Colors.Destination.accentColor(for: destination)
  }

  private var terrainIcon: String {
    let hash = abs(destination.hashValue)
    let icons = ["mountain.2", "water.waves", "tree", "building.2", "sun.max", "leaf"]
    return icons[hash % icons.count]
  }

  init(_ destination: String, size: Size = .medium, showIcon: Bool = true) {
    self.destination = destination
    self.size = size
    self.showIcon = showIcon
  }

  var body: some View {
    HStack(spacing: 4) {
      if showIcon {
        Image(systemName: terrainIcon)
          .font(.system(size: size.iconSize))
      }
      Text(destination)
        .font(size.font)
        .fontWeight(.medium)
    }
    .foregroundStyle(terrainColor)
    .padding(size.padding)
    .background(terrainColor.opacity(colorScheme == .dark ? 0.2 : 0.12))
    .clipShape(Capsule())
    .overlay(
      Capsule()
        .stroke(terrainColor.opacity(0.3), lineWidth: 0.5)
    )
  }
}

// MARK: - Travel Status Indicator (旅行状态指示器)

struct TravelStatusIndicator: View {
  let status: Status
  let size: Size

  enum Status {
    case upcoming, active, completed, cancelled, draft

    var label: String {
      switch self {
      case .upcoming: return "即将出发"
      case .active: return "进行中"
      case .completed: return "已完成"
      case .cancelled: return "已取消"
      case .draft: return "草稿"
      }
    }

    var icon: String {
      switch self {
      case .upcoming: return "calendar.badge.clock"
      case .active: return "airplane"
      case .completed: return "checkmark.circle.fill"
      case .cancelled: return "xmark.circle"
      case .draft: return "pencil.circle"
      }
    }

    var color: Color {
      switch self {
      case .upcoming: return DesignTokens.Colors.TravelStatus.upcoming
      case .active: return DesignTokens.Colors.TravelStatus.active
      case .completed: return DesignTokens.Colors.TravelStatus.completed
      case .cancelled: return DesignTokens.Colors.TravelStatus.cancelled
      case .draft: return DesignTokens.Colors.TravelStatus.draft
      }
    }

    var backgroundColor: Color {
      switch self {
      case .upcoming: return DesignTokens.Colors.TravelStatus.upcomingBackground
      case .active: return DesignTokens.Colors.TravelStatus.activeBackground
      case .completed: return DesignTokens.Colors.TravelStatus.completedBackground
      case .cancelled: return DesignTokens.Colors.TravelStatus.cancelledBackground
      case .draft: return DesignTokens.Colors.TravelStatus.draftBackground
      }
    }
  }

  enum Size {
    case compact, standard, expanded
  }

  init(_ status: Status, size: Size = .standard) {
    self.status = status
    self.size = size
  }

  var body: some View {
    switch size {
    case .compact:
      compactView
    case .standard:
      standardView
    case .expanded:
      expandedView
    }
  }

  private var compactView: some View {
    Circle()
      .fill(status.color)
      .frame(width: 8, height: 8)
  }

  private var standardView: some View {
    HStack(spacing: 4) {
      Image(systemName: status.icon)
        .font(.caption2)
      Text(status.label)
        .font(.caption2)
        .fontWeight(.medium)
    }
    .foregroundStyle(status.color)
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(status.backgroundColor)
    .clipShape(Capsule())
  }

  private var expandedView: some View {
    HStack(spacing: 8) {
      Circle()
        .fill(status.color)
        .frame(width: 10, height: 10)
        .overlay(
          Circle()
            .stroke(status.color.opacity(0.3), lineWidth: 2)
            .scaleEffect(1.5)
        )

      VStack(alignment: .leading, spacing: 2) {
        Text(status.label)
          .font(.subheadline)
          .fontWeight(.semibold)
          .foregroundStyle(status.color)
      }
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(status.backgroundColor)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
  }
}

// MARK: - Explorer Divider (探索者分隔线)

struct ExplorerDivider: View {
  let style: Style
  let color: Color

  @Environment(\.colorScheme) private var colorScheme

  enum Style {
    case simple, dotted, decorated, topographic
  }

  init(style: Style = .simple, color: Color? = nil) {
    self.style = style
    self.color = color ?? DesignTokens.Colors.separator
  }

  var body: some View {
    switch style {
    case .simple:
      simpleDivider
    case .dotted:
      dottedDivider
    case .decorated:
      decoratedDivider
    case .topographic:
      topographicDivider
    }
  }

  private var simpleDivider: some View {
    Rectangle()
      .fill(color.opacity(0.3))
      .frame(height: 1)
  }

  private var dottedDivider: some View {
    GeometryReader { geometry in
      HStack(spacing: 4) {
        ForEach(0..<Int(geometry.size.width / 8), id: \.self) { _ in
          Circle()
            .fill(color.opacity(0.3))
            .frame(width: 2, height: 2)
        }
      }
    }
    .frame(height: 2)
  }

  private var decoratedDivider: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      Rectangle()
        .fill(
          LinearGradient(
            colors: [.clear, color.opacity(0.3)],
            startPoint: .leading,
            endPoint: .trailing
          )
        )
        .frame(height: 1)

      Image(systemName: "diamond.fill")
        .font(.system(size: 6))
        .foregroundStyle(color.opacity(0.4))

      Rectangle()
        .fill(
          LinearGradient(
            colors: [color.opacity(0.3), .clear],
            startPoint: .leading,
            endPoint: .trailing
          )
        )
        .frame(height: 1)
    }
  }

  private var topographicDivider: some View {
    Canvas { context, size in
      var path = Path()
      path.move(to: CGPoint(x: 0, y: size.height / 2))

      for x in stride(from: 0, to: size.width, by: 4) {
        let y = size.height / 2 + sin(x * 0.05) * 3
        path.addLine(to: CGPoint(x: x, y: y))
      }

      context.stroke(path, with: .color(color.opacity(0.3)), lineWidth: 1)
    }
    .frame(height: 10)
  }
}

// MARK: - Explorer Empty State (探索者空状态)

struct ExplorerEmptyState: View {
  let icon: String
  let title: String
  let message: String
  let actionLabel: String?
  let action: (() -> Void)?

  @Environment(\.colorScheme) private var colorScheme
  @State private var isAnimating = false

  init(
    icon: String = "map",
    title: String,
    message: String,
    actionLabel: String? = nil,
    action: (() -> Void)? = nil
  ) {
    self.icon = icon
    self.title = title
    self.message = message
    self.actionLabel = actionLabel
    self.action = action
  }

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.xl) {
      ZStack {
        Circle()
          .fill(DesignTokens.Colors.accent.opacity(colorScheme == .dark ? 0.15 : 0.1))
          .frame(width: 120, height: 120)

        TopographicLinesView(lineCount: 4, lineColor: DesignTokens.Colors.accent.opacity(0.2))
          .frame(width: 100, height: 100)
          .clipShape(Circle())

        Image(systemName: icon)
          .font(.system(size: 40, weight: .light))
          .foregroundStyle(DesignTokens.Colors.accent)
          .offset(y: isAnimating ? -4 : 4)
      }
      .onAppear {
        withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
          isAnimating = true
        }
      }

      VStack(spacing: DesignTokens.Spacing.xs) {
        Text(title)
          .font(.title3)
          .fontWeight(.bold)
          .foregroundStyle(.primary)

        Text(message)
          .font(.subheadline)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
          .lineLimit(3)
      }

      if let actionLabel = actionLabel, let action = action {
        Button(action: action) {
          Text(actionLabel)
            .font(.subheadline)
            .fontWeight(.semibold)
        }
        .buttonStyle(.primary)
      }
    }
    .padding(DesignTokens.Spacing.xxl)
    .frame(maxWidth: .infinity)
  }
}

// MARK: - Floating Action Button (浮动操作按钮)

struct FloatingActionButton: View {
  let icon: String
  let color: Color
  let action: () -> Void

  @Environment(\.colorScheme) private var colorScheme
  @State private var isPressed = false
  @State private var glowOpacity: Double = 0.3

  init(icon: String = "plus", color: Color = DesignTokens.Colors.accent, action: @escaping () -> Void) {
    self.icon = icon
    self.color = color
    self.action = action
  }

  var body: some View {
    Button(action: action) {
      ZStack {
        Circle()
          .fill(
            LinearGradient(
              colors: [color, color.opacity(0.8)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 56, height: 56)

        Image(systemName: icon)
          .font(.system(size: 22, weight: .semibold))
          .foregroundStyle(.white)
      }
      .shadow(color: color.opacity(glowOpacity), radius: colorScheme == .dark ? 12 : 8, y: 4)
      .scaleEffect(isPressed ? 0.92 : 1)
    }
    .buttonStyle(.plain)
    .simultaneousGesture(
      DragGesture(minimumDistance: 0)
        .onChanged { _ in
          withAnimation(.spring(response: 0.2)) {
            isPressed = true
          }
        }
        .onEnded { _ in
          withAnimation(.spring(response: 0.2)) {
            isPressed = false
          }
        }
    )
    .onAppear {
      if colorScheme == .dark {
        withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
          glowOpacity = 0.5
        }
      }
    }
  }
}

// MARK: - Explorer Loading Indicator (探索者加载指示器)

struct ExplorerLoadingIndicator: View {
  let message: String?
  let size: CGFloat

  @State private var rotation: Double = 0

  init(message: String? = nil, size: CGFloat = 40) {
    self.message = message
    self.size = size
  }

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      CompassRoseDecoration(size: size, color: DesignTokens.Colors.accent, opacity: 0.6)
        .rotationEffect(.degrees(rotation))
        .onAppear {
          withAnimation(.linear(duration: 2).repeatForever(autoreverses: false)) {
            rotation = 360
          }
        }

      if let message = message {
        Text(message)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
    }
  }
}

// MARK: - Explorer Skeleton Card (探索者骨架屏卡片)

struct ExplorerSkeletonCard: View {
  @Environment(\.colorScheme) private var colorScheme
  @State private var shimmerPhase: CGFloat = 0

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Rectangle()
        .fill(shimmerGradient)
        .frame(height: 150)

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        RoundedRectangle(cornerRadius: 4)
          .fill(shimmerGradient)
          .frame(width: 120, height: 14)

        RoundedRectangle(cornerRadius: 4)
          .fill(shimmerGradient)
          .frame(height: 18)

        RoundedRectangle(cornerRadius: 4)
          .fill(shimmerGradient)
          .frame(width: 200, height: 18)

        HStack {
          RoundedRectangle(cornerRadius: 4)
            .fill(shimmerGradient)
            .frame(width: 80, height: 12)
          Spacer()
          RoundedRectangle(cornerRadius: 4)
            .fill(shimmerGradient)
            .frame(width: 60, height: 12)
        }
      }
      .padding(DesignTokens.Spacing.md)
    }
    .background(DesignTokens.Colors.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    .onAppear {
      withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
        shimmerPhase = 1
      }
    }
  }

  private var shimmerGradient: LinearGradient {
    let baseColor = colorScheme == .dark ? Color.white.opacity(0.08) : Color.black.opacity(0.06)
    let highlightColor = colorScheme == .dark ? Color.white.opacity(0.15) : Color.black.opacity(0.12)

    return LinearGradient(
      colors: [baseColor, highlightColor, baseColor],
      startPoint: UnitPoint(x: shimmerPhase - 1, y: 0.5),
      endPoint: UnitPoint(x: shimmerPhase, y: 0.5)
    )
  }
}

// MARK: - Swipe Hint View (滑动提示)

struct SwipeHintView: View {
  let direction: Direction
  @State private var offset: CGFloat = 0

  enum Direction {
    case left, right

    var icon: String {
      switch self {
      case .left: return "chevron.left"
      case .right: return "chevron.right"
      }
    }
  }

  init(direction: Direction = .right) {
    self.direction = direction
  }

  var body: some View {
    HStack(spacing: 2) {
      if direction == .left {
        chevrons
      }
      Spacer()
      if direction == .right {
        chevrons
      }
    }
    .onAppear {
      withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
        offset = direction == .right ? 8 : -8
      }
    }
  }

  private var chevrons: some View {
    HStack(spacing: -4) {
      ForEach(0..<3, id: \.self) { index in
        Image(systemName: direction.icon)
          .font(.caption2)
          .foregroundStyle(.secondary.opacity(0.3 + Double(index) * 0.2))
      }
    }
    .offset(x: offset)
  }
}

// MARK: - Preview

#Preview("Explorer Components") {
  ScrollView {
    VStack(spacing: 24) {
      ExplorerSectionHeader("热门目的地", subtitle: "发现新的旅程", icon: "map.fill", action: {})

      HStack(spacing: 8) {
        DestinationBadge("京都", size: .small)
        DestinationBadge("东京", size: .medium)
        DestinationBadge("大阪", size: .large, showIcon: false)
      }

      HStack(spacing: 12) {
        TravelStatusIndicator(.upcoming, size: .compact)
        TravelStatusIndicator(.active)
        TravelStatusIndicator(.completed, size: .expanded)
      }

      VStack(spacing: 16) {
        ExplorerDivider(style: .simple)
        ExplorerDivider(style: .dotted)
        ExplorerDivider(style: .decorated)
        ExplorerDivider(style: .topographic)
      }

      ExplorerEmptyState(
        icon: "airplane",
        title: "暂无旅程",
        message: "开始规划你的下一次冒险吧",
        actionLabel: "创建旅程",
        action: {}
      )

      ExplorerLoadingIndicator(message: "正在探索...")

      ExplorerSkeletonCard()
        .frame(width: 280)

      HStack {
        Spacer()
        FloatingActionButton(icon: "plus") {}
      }
      .padding()
    }
    .padding()
  }
  .background(Color(.systemGroupedBackground))
}
