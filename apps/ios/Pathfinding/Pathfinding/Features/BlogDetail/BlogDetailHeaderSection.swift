import SwiftUI

/// Header for the blog detail screen: title, meta, quick-info cards, and AI summary.
struct BlogDetailHeaderSection: View {
  let guide: BlogPost

  var body: some View {
    // Title & Meta
    titleSection

    // Quick Info Cards
    if guide.aiProcessedAt != nil {
      quickInfoSection
    }

    // AI Summary
    if let summary = guide.aiSummary {
      aiSummarySection(summary)
    }
  }

  // MARK: - Title Section

  private var titleSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // AI Badge
      if guide.aiProcessedAt != nil {
        Badge("AI 智能分析", icon: "sparkles", style: .ai)
      }

      Text(guide.title)
        .font(.title2)
        .fontWeight(.bold)

      // Author & Stats
      HStack(spacing: DesignTokens.Spacing.md) {
        if let author = guide.author {
          Label(author, systemImage: "person.circle.fill")
        }
        Spacer()
        if let views = guide.viewCount {
          StatLabel(icon: "eye", value: "\(views)")
        }
        if let likes = guide.likeCount {
          StatLabel(icon: "heart.fill", value: "\(likes)", color: .red.opacity(0.7))
        }
      }
      .font(.caption)
      .foregroundStyle(.secondary)
    }
  }

  // MARK: - Quick Info Section

  private var quickInfoSection: some View {
    let columns = [
      GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
      GridItem(.flexible(), spacing: DesignTokens.Spacing.sm)
    ]

    return LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.sm) {
      if let duration = guide.aiDuration {
        QuickInfoCard(icon: "clock", title: "时长", value: duration, color: DesignTokens.Colors.info)
      }
      if let budget = guide.aiBudget {
        QuickInfoCard(icon: "yensign.circle", title: "预算", value: budget, color: DesignTokens.Colors.success)
      }
      if let bestTime = guide.aiBestTime {
        QuickInfoCard(icon: "calendar", title: "最佳时间", value: bestTime, color: DesignTokens.Colors.warning)
      }
      if let days = guide.aiDays {
        QuickInfoCard(
          icon: "map",
          title: "行程",
          value: "\(days.count)天",
          color: DesignTokens.Colors.aiPurple
        )
      }
    }
  }

  // MARK: - AI Summary Section

  private func aiSummarySection(_ summary: String) -> some View {
    HStack(spacing: 0) {
      // Left gradient border accent
      RoundedRectangle(cornerRadius: DesignTokens.Radius.xxs)
        .fill(
          LinearGradient(
            colors: [DesignTokens.Colors.aiPurple, DesignTokens.Colors.accent],
            startPoint: .top,
            endPoint: .bottom
          )
        )
        .frame(width: 4)

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        Label("AI 摘要", systemImage: "sparkles")
          .font(.headline)
          .foregroundStyle(DesignTokens.Colors.aiPurple)

        Text(summary)
          .font(.body)
          .lineSpacing(4)
      }
      .padding(DesignTokens.Spacing.md)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(DesignTokens.Colors.aiPurple.opacity(0.08))
    )
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
  }
}
