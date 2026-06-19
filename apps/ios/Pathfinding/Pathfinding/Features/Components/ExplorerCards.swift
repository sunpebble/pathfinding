import SwiftUI

// MARK: - Explorer Guide Row

/// 探索者风格的列表行 - 紧凑但精致的设计
@available(*, deprecated, message: "iOS 26: use cardSurface / system glass; pending Chat/Profile/Auth migration")
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
    .accessibilityElement(children: .combine)
    .accessibilityLabel(rowAccessibilityLabel)
    .accessibilityHint("双击查看详情")
  }

  private var rowAccessibilityLabel: String {
    var parts = [guide.title]
    if let author = guide.author { parts.append("作者 \(author)") }
    if let destinations = guide.destinations, !destinations.isEmpty {
      parts.append("目的地 \(destinations.prefix(3).joined(separator: "、"))")
    }
    return parts.joined(separator: "，")
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

// MARK: - Preview

private let previewGuide = BlogPost(
  id: "preview-1",
  title: "京都赏樱三日游攻略",
  authorName: "旅行达人",
  content: nil,
  contentHtml: nil,
  contentMarkdown: nil,
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

#Preview("Explorer Cards") {
  ScrollView {
    VStack(spacing: 24) {
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
}
