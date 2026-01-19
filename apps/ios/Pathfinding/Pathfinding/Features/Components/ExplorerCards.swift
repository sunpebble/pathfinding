import SwiftUI

// MARK: - Explorer Featured Card
// 探索者风格的精选卡片 - 融合地形美学的高影响力设计

struct ExplorerFeaturedCard: View {
  let guide: BlogPost
  @Environment(\.colorScheme) private var colorScheme
  @State private var isPressed = false
  @State private var isVisible = false

  // 根据目的地生成主题色
  private var themeColor: Color {
    guard let destination = guide.destinations?.first else { return DesignTokens.Colors.accent }
    let hash = destination.hashValue
    let colors: [Color] = [.indigo, .teal, .orange, .purple, .pink, .cyan]
    return colors[abs(hash) % colors.count]
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      // 顶部图片区域
      ZStack(alignment: .topTrailing) {
        // 封面图片
        ZStack(alignment: .bottom) {
          CachedAsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
            image
              .resizable()
              .aspectRatio(contentMode: .fill)
          } placeholder: {
            // 增强的占位符 - 带等高线背景
            ZStack {
              LinearGradient(
                colors: [themeColor.opacity(0.4), themeColor.opacity(0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
              )
              TopographicLinesView(lineCount: 5, lineColor: .white.opacity(0.15))
              Image(systemName: "map")
                .font(.system(size: 40))
                .foregroundStyle(.white.opacity(0.4))
            }
          }
          .frame(width: 300, height: 200)
          .clipped()

          // 底部渐变遮罩
          LinearGradient(
            colors: [.clear, .black.opacity(0.6)],
            startPoint: .top,
            endPoint: .bottom
          )
          .frame(height: 80)

          // 核心旅行数据
          if guide.aiProcessedAt != nil {
            HStack(spacing: DesignTokens.Spacing.sm) {
              if let duration = guide.aiDuration {
                ExplorerDataBadge(icon: "clock", text: duration)
              }
              if let budget = guide.aiBudget {
                ExplorerDataBadge(icon: "yensign.circle", text: budget)
              }
              if let days = guide.aiDays {
                ExplorerDataBadge(icon: "calendar", text: "\(days.count)天")
              }
              Spacer()
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.bottom, DesignTokens.Spacing.sm)
          }
        }

        // AI 徽章 - 带动态边框
        if guide.aiProcessedAt != nil {
          ExplorerAIBadge()
            .padding(DesignTokens.Spacing.sm)
        }
      }

      // 内容区域
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        // 目的地标签
        if let destinations = guide.destinations, !destinations.isEmpty {
          ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.xxs) {
              ForEach(destinations.prefix(3), id: \.self) { dest in
                ExplorerDestinationTag(text: dest, color: themeColor)
              }
            }
          }
        }

        // 标题
        Text(guide.title)
          .font(.headline)
          .fontWeight(.bold)
          .lineLimit(2)
          .foregroundStyle(.primary)

        // 作者和统计
        HStack(spacing: DesignTokens.Spacing.sm) {
          if let author = guide.author {
            HStack(spacing: DesignTokens.Spacing.xxs) {
              Image(systemName: "person.circle.fill")
                .foregroundStyle(themeColor.opacity(0.7))
              Text(author)
                .lineLimit(1)
            }
            .font(.caption)
            .foregroundStyle(.secondary)
          }

          Spacer()

          if let views = guide.viewCount {
            StatLabel(icon: "eye", value: formatNumber(views))
          }
          if let likes = guide.likeCount {
            StatLabel(icon: "heart.fill", value: formatNumber(likes), color: .red.opacity(0.7))
          }
        }
      }
      .padding(DesignTokens.Spacing.md)
      .background(
        ZStack {
          DesignTokens.Colors.cardBackground
          // 微妙的等高线装饰
          TopographicLinesView(lineCount: 3, lineColor: themeColor.opacity(0.05))
        }
      )
    }
    .frame(width: 300)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    .overlay(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
        .stroke(
          LinearGradient(
            colors: [themeColor.opacity(0.3), themeColor.opacity(0.1), .clear],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          ),
          lineWidth: 1
        )
    )
    .shadow(
      color: colorScheme == .dark ? themeColor.opacity(0.2) : .black.opacity(0.08),
      radius: colorScheme == .dark ? 16 : 12,
      y: 6
    )
    .scaleEffect(isPressed ? 0.97 : 1)
    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPressed)
    .opacity(isVisible ? 1 : 0)
    .offset(y: isVisible ? 0 : 20)
    .onAppear {
      withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
        isVisible = true
      }
    }
    .simultaneousGesture(
      DragGesture(minimumDistance: 0)
        .onChanged { _ in isPressed = true }
        .onEnded { _ in isPressed = false }
    )
  }

  private func formatNumber(_ num: Int) -> String {
    if num >= 10000 {
      return String(format: "%.1fw", Double(num) / 10000)
    } else if num >= 1000 {
      return String(format: "%.1fk", Double(num) / 1000)
    }
    return "\(num)"
  }
}

// MARK: - Explorer Data Badge

private struct ExplorerDataBadge: View {
  let icon: String
  let text: String

  private var displayText: String {
    if text.count > 8 {
      return String(text.prefix(7)) + "…"
    }
    return text
  }

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.xxs) {
      Image(systemName: icon)
        .font(.caption2)
      Text(displayText)
        .font(.caption2)
        .fontWeight(.medium)
        .lineLimit(1)
    }
    .foregroundStyle(.white)
    .padding(.horizontal, DesignTokens.Spacing.xs)
    .padding(.vertical, 4)
    .background(.ultraThinMaterial.opacity(0.8))
    .clipShape(Capsule())
  }
}

// MARK: - Explorer AI Badge

private struct ExplorerAIBadge: View {
  @State private var glowOpacity: Double = 0.4

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.xxs) {
      Image(systemName: "sparkles")
      Text("AI")
    }
    .font(.caption2)
    .fontWeight(.bold)
    .foregroundStyle(.white)
    .padding(.horizontal, DesignTokens.Spacing.sm)
    .padding(.vertical, DesignTokens.Spacing.xxs)
    .background(
      ZStack {
        Capsule()
          .fill(
            LinearGradient(
              colors: [.purple, .indigo],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
        Capsule()
          .stroke(
            LinearGradient(
              colors: [.white.opacity(0.5), .clear],
              startPoint: .top,
              endPoint: .bottom
            ),
            lineWidth: 0.5
          )
      }
    )
    .shadow(color: .purple.opacity(glowOpacity), radius: 8, y: 2)
    .onAppear {
      withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
        glowOpacity = 0.7
      }
    }
  }
}

// MARK: - Explorer Destination Tag

private struct ExplorerDestinationTag: View {
  let text: String
  let color: Color

  var body: some View {
    Text(text)
      .font(.caption2)
      .fontWeight(.medium)
      .padding(.horizontal, DesignTokens.Spacing.sm)
      .padding(.vertical, DesignTokens.Spacing.xxs)
      .background(color.opacity(0.12))
      .foregroundStyle(color)
      .clipShape(Capsule())
      .overlay(
        Capsule()
          .stroke(color.opacity(0.2), lineWidth: 0.5)
      )
  }
}

// MARK: - Explorer Guide Row

/// 探索者风格的列表行 - 紧凑但精致的设计
struct ExplorerGuideRow: View {
  let guide: BlogPost
  let index: Int

  @Environment(\.colorScheme) private var colorScheme
  @State private var isPressed = false

  private var themeColor: Color {
    guard let destination = guide.destinations?.first else { return DesignTokens.Colors.accent }
    let hash = destination.hashValue
    let colors: [Color] = [.indigo, .teal, .orange, .purple, .pink, .cyan]
    return colors[abs(hash) % colors.count]
  }

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // 缩略图
      ZStack(alignment: .topTrailing) {
        CachedAsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
          image
            .resizable()
            .aspectRatio(contentMode: .fill)
        } placeholder: {
          ZStack {
            LinearGradient(
              colors: [themeColor.opacity(0.3), themeColor.opacity(0.15)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
            TopographicLinesView(lineCount: 3, lineColor: .white.opacity(0.2))
          }
        }
        .frame(width: 100, height: 75)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

        // AI 指示器
        if guide.aiProcessedAt != nil {
          Circle()
            .fill(
              LinearGradient(
                colors: [.purple, .indigo],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
              )
            )
            .frame(width: 20, height: 20)
            .overlay {
              Image(systemName: "sparkles")
                .font(.system(size: 10))
                .foregroundStyle(.white)
            }
            .shadow(color: .purple.opacity(0.4), radius: 4, y: 1)
            .offset(x: 4, y: -4)
        }
      }

      // 内容
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
        // 标题
        Text(guide.title)
          .font(.subheadline)
          .fontWeight(.semibold)
          .lineLimit(2)
          .foregroundStyle(.primary)

        // 核心数据
        if guide.aiProcessedAt != nil {
          HStack(spacing: DesignTokens.Spacing.xs) {
            if let duration = guide.aiDuration {
              CompactExplorerTag(icon: "clock", text: duration, color: themeColor)
            }
            if let budget = guide.aiBudget {
              CompactExplorerTag(icon: "yensign.circle", text: budget, color: themeColor)
            }
          }
        }

        Spacer(minLength: 0)

        // 底部信息
        HStack(spacing: DesignTokens.Spacing.xs) {
          if let author = guide.author {
            Text(author)
              .lineLimit(1)
          }

          Spacer()

          if let views = guide.viewCount, views > 0 {
            StatLabel(icon: "eye", value: formatNumber(views))
          }
          if let likes = guide.likeCount, likes > 0 {
            StatLabel(icon: "heart.fill", value: formatNumber(likes), color: .red.opacity(0.7))
          }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .background(
      ZStack {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
          .fill(DesignTokens.Colors.cardBackground)

        // 左侧强调线
        HStack {
          RoundedRectangle(cornerRadius: 2)
            .fill(themeColor.gradient)
            .frame(width: 3)
          Spacer()
        }
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
      }
    )
    .overlay(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .stroke(DesignTokens.Colors.cardBorder(for: colorScheme), lineWidth: colorScheme == .dark ? 0.5 : 0)
    )
    .shadow(
      color: colorScheme == .dark ? themeColor.opacity(0.1) : .black.opacity(0.04),
      radius: 6,
      y: 2
    )
    .scaleEffect(isPressed ? 0.98 : 1)
    .animation(.spring(response: 0.2, dampingFraction: 0.7), value: isPressed)
    .staggeredAnimation(index: index, baseDelay: 0.03)
    .simultaneousGesture(
      DragGesture(minimumDistance: 0)
        .onChanged { _ in isPressed = true }
        .onEnded { _ in isPressed = false }
    )
  }

  private func formatNumber(_ num: Int) -> String {
    if num >= 10000 {
      return String(format: "%.1fw", Double(num) / 10000)
    } else if num >= 1000 {
      return String(format: "%.1fk", Double(num) / 1000)
    }
    return "\(num)"
  }
}

// MARK: - Compact Explorer Tag

private struct CompactExplorerTag: View {
  let icon: String
  let text: String
  let color: Color

  private var displayText: String {
    if text.count > 8 {
      return String(text.prefix(7)) + "…"
    }
    return text
  }

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.xxs) {
      Image(systemName: icon)
      Text(displayText)
        .lineLimit(1)
    }
    .font(.caption2)
    .foregroundStyle(color)
    .padding(.horizontal, DesignTokens.Spacing.xs)
    .padding(.vertical, 2)
    .background(color.opacity(0.1))
    .clipShape(Capsule())
  }
}

// MARK: - Explorer Hero Header

/// 探索者风格的 Hero 头部 - 用于页面顶部的大型展示区域
struct ExplorerHeroHeader: View {
  let title: String
  let subtitle: String?
  let accentColor: Color

  @Environment(\.colorScheme) private var colorScheme
  @State private var isVisible = false

  init(title: String, subtitle: String? = nil, accentColor: Color = DesignTokens.Colors.accent) {
    self.title = title
    self.subtitle = subtitle
    self.accentColor = accentColor
  }

  var body: some View {
    ZStack {
      // 背景层
      ZStack {
        // 渐变背景
        LinearGradient(
          colors: [
            accentColor.opacity(colorScheme == .dark ? 0.3 : 0.15),
            accentColor.opacity(colorScheme == .dark ? 0.1 : 0.05),
            .clear
          ],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )

        // 等高线装饰
        TopographicLinesView(lineCount: 6, lineColor: accentColor.opacity(0.1), animated: true)

        // 指南针装饰
        CompassRoseDecoration(size: 200, color: accentColor, opacity: 0.08)
          .offset(x: 80, y: -20)

        // 噪点纹理
        NoiseTextureOverlay(opacity: 0.02)
      }

      // 内容层
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        Text(title)
          .font(DesignTokens.Typography.Display.hero)
          .foregroundStyle(.primary)
          .opacity(isVisible ? 1 : 0)
          .offset(y: isVisible ? 0 : 20)

        if let subtitle = subtitle {
          Text(subtitle)
            .font(.title3)
            .foregroundStyle(.secondary)
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 15)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(DesignTokens.Spacing.xl)
    }
    .frame(height: 200)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xl))
    .onAppear {
      withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
        isVisible = true
      }
    }
  }
}

// MARK: - Preview

private let previewGuide = BlogPost(
  id: "preview-1",
  title: "京都赏樱三日游攻略",
  authorName: "旅行达人",
  content: nil,
  summary: nil,
  coverImageUrl: nil,
  imageUrls: nil,
  sourcePlatform: "xiaohongshu",
  qualityScore: nil,
  viewsCount: 1234,
  likesCount: 567,
  savesCount: 89,
  createdAt: nil,
  destinations: ["京都"],
  aiSummary: "这是一份完整的京都赏樱攻略，包含最佳观赏地点和时间推荐。",
  aiTips: nil,
  aiBestTime: nil,
  aiDuration: "3天",
  aiBudget: nil,
  aiDays: [
    AiDay(dayNumber: 1, theme: "抵达", pois: []),
    AiDay(dayNumber: 2, theme: "赏樱", pois: []),
    AiDay(dayNumber: 3, theme: "寺庙", pois: [])
  ],
  aiProcessedAt: nil
)

#Preview("Explorer Cards - Light") {
  ScrollView {
    VStack(spacing: 24) {
      // Hero Header
      ExplorerHeroHeader(
        title: "探索",
        subtitle: "发现精彩旅程",
        accentColor: .indigo
      )

      // Featured Card
      ExplorerFeaturedCard(
        guide: previewGuide
      )

      // Guide Rows
      ForEach(0..<3) { index in
        ExplorerGuideRow(
          guide: previewGuide,
          index: index
        )
      }
    }
    .padding()
  }
  .background(Color(.systemGroupedBackground))
  .preferredColorScheme(.light)
}

#Preview("Explorer Cards - Dark") {
  ScrollView {
    VStack(spacing: 24) {
      // Hero Header
      ExplorerHeroHeader(
        title: "探索",
        subtitle: "发现精彩旅程",
        accentColor: .purple
      )

      // Featured Card
      ExplorerFeaturedCard(
        guide: previewGuide
      )

      // Guide Rows
      ForEach(0..<3) { index in
        ExplorerGuideRow(
          guide: previewGuide,
          index: index
        )
      }
    }
    .padding()
  }
  .background(Color(.systemBackground))
  .preferredColorScheme(.dark)
}
