import SwiftUI

// MARK: - Section Header

struct SectionHeader: View {
  let title: String
  let icon: String
  var iconColor: Color = .accentColor

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.xs) {
      Image(systemName: icon)
        .foregroundStyle(iconColor)
        .font(.subheadline)
      Text(title)
        .font(.title3)
        .fontWeight(.semibold)
    }
  }
}

// MARK: - Featured Card

struct FeaturedCard: View {
  let guide: BlogPost

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      // Cover Image with Core Data Overlay
      ZStack(alignment: .bottom) {
        ZStack(alignment: .topTrailing) {
          CachedAsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
            image
              .resizable()
              .aspectRatio(contentMode: .fill)
          } placeholder: {
            Rectangle()
              .fill(
                LinearGradient(
                  colors: [DesignTokens.Colors.accent.opacity(0.3), DesignTokens.Colors.accentSecondary.opacity(0.2)],
                  startPoint: .topLeading,
                  endPoint: .bottomTrailing
                )
              )
              .overlay {
                Image(systemName: "photo")
                  .font(.title)
                  .foregroundStyle(.white.opacity(0.5))
              }
          }
          .frame(width: 280, height: 180)
          .clipped()

          // AI Badge
          if guide.aiProcessedAt != nil {
            Badge("AI", icon: "sparkles", style: .ai)
              .padding(DesignTokens.Spacing.sm)
          }
        }

        // Core Travel Data Bar - only show if AI processed
        if guide.aiProcessedAt != nil {
          HStack(spacing: DesignTokens.Spacing.sm) {
            if let duration = guide.aiDuration {
              CoreDataBadge(icon: "clock", text: duration)
            }
            if let budget = guide.aiBudget {
              CoreDataBadge(icon: "yensign.circle", text: budget)
            }
            if let days = guide.aiDays {
              CoreDataBadge(icon: "calendar", text: "\(days.count)天")
            }
            Spacer()
          }
          .padding(.horizontal, DesignTokens.Spacing.sm)
          .padding(.vertical, DesignTokens.Spacing.xs)
          .background(.ultraThinMaterial)
        }
      }

      // Content
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        // Destination tags
        if let destinations = guide.destinations, !destinations.isEmpty {
          HStack(spacing: DesignTokens.Spacing.xxs) {
            ForEach(destinations.prefix(2), id: \.self) { dest in
              Text(dest)
                .font(.caption2)
                .fontWeight(.medium)
                .padding(.horizontal, DesignTokens.Spacing.xs)
                .padding(.vertical, DesignTokens.Spacing.xxs)
                .background(DesignTokens.Colors.accent.opacity(0.1))
                .foregroundStyle(DesignTokens.Colors.accent)
                .clipShape(Capsule())
            }
          }
        }

        Text(guide.title)
          .font(.headline)
          .fontWeight(.bold)
          .lineLimit(2)
          .foregroundStyle(.primary)

        HStack(spacing: DesignTokens.Spacing.sm) {
          if let author = guide.author {
            HStack(spacing: DesignTokens.Spacing.xxs) {
              Image(systemName: "person.circle.fill")
                .foregroundStyle(.tertiary)
              Text(author)
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
          }

          Spacer()

          if let views = guide.viewCount {
            StatLabel(icon: "eye", value: formatNumber(views))
          }
        }
      }
      .padding(DesignTokens.Spacing.sm)
    }
    .frame(width: 280)
    .cardStyle(radius: DesignTokens.Radius.lg)
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

// MARK: - Core Data Badge

private struct CoreDataBadge: View {
  let icon: String
  let text: String

  /// Truncate long text to max characters
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
  }
}

// MARK: - Compact Guide Card

struct CompactGuideCard: View {
  let guide: BlogPost

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      // Thumbnail
      ZStack(alignment: .topTrailing) {
        CachedAsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
          image
            .resizable()
            .aspectRatio(contentMode: .fill)
        } placeholder: {
          Rectangle()
            .fill(
              LinearGradient(
                colors: [.gray.opacity(0.2), .gray.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
              )
            )
        }
        .frame(width: 100, height: 80)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

        if guide.aiProcessedAt != nil {
          Image(systemName: "sparkles")
            .font(.caption2)
            .foregroundStyle(.white)
            .padding(4)
            .background(Color.aiPurple.gradient)
            .clipShape(Circle())
            .offset(x: 4, y: -4)
        }
      }

      // Content
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        Text(guide.title)
          .font(.subheadline)
          .fontWeight(.medium)
          .lineLimit(2)
          .foregroundStyle(.primary)

        Spacer()

        HStack(spacing: DesignTokens.Spacing.xs) {
          if let author = guide.author {
            Text(author)
              .lineLimit(1)
          }

          Spacer()

          if let likes = guide.likeCount {
            HStack(spacing: 2) {
              Image(systemName: "heart.fill")
                .foregroundStyle(.red.opacity(0.8))
              Text("\(likes)")
            }
          }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.md)
  }
}

// MARK: - Guide List Row

struct GuideListRow: View {
  let guide: BlogPost

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      // Thumbnail
      ZStack(alignment: .topTrailing) {
        CachedAsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
          image
            .resizable()
            .aspectRatio(contentMode: .fill)
        } placeholder: {
          Rectangle()
            .fill(DesignTokens.Colors.fillTertiary)
        }
        .frame(width: 90, height: 68)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))

        // AI indicator
        if guide.aiProcessedAt != nil {
          Circle()
            .fill(DesignTokens.Colors.aiPurple.gradient)
            .frame(width: 18, height: 18)
            .overlay {
              Image(systemName: "sparkles")
                .font(.system(size: 9))
                .foregroundStyle(.white)
            }
            .offset(x: 4, y: -4)
        }
      }

      // Content
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
        Text(guide.title)
          .font(.subheadline)
          .fontWeight(.semibold)
          .lineLimit(2)
          .foregroundStyle(.primary)

        // Core travel data - compact display
        if guide.aiProcessedAt != nil {
          HStack(spacing: DesignTokens.Spacing.xs) {
            if let duration = guide.aiDuration {
              CompactInfoTag(icon: "clock", text: duration)
            }
            if let budget = guide.aiBudget {
              CompactInfoTag(icon: "yensign.circle", text: budget)
            }
          }
        }

        Spacer()

        HStack(spacing: DesignTokens.Spacing.xs) {
          if let author = guide.author {
            Text(author)
              .lineLimit(1)
          }

          Spacer()

          // Stats
          HStack(spacing: DesignTokens.Spacing.sm) {
            if let views = guide.viewCount, views > 0 {
              StatLabel(icon: "eye", value: formatNumber(views))
            }
            if let likes = guide.likeCount, likes > 0 {
              StatLabel(icon: "heart.fill", value: formatNumber(likes), color: DesignTokens.Colors.error.opacity(0.7))
            }
          }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.sm)
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

// MARK: - Compact Info Tag

private struct CompactInfoTag: View {
  let icon: String
  let text: String

  /// Truncate long text to max characters
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
    .foregroundStyle(.secondary)
    .padding(.horizontal, DesignTokens.Spacing.xs)
    .padding(.vertical, 2)
    .background(DesignTokens.Colors.fillQuaternary)
    .clipShape(Capsule())
  }
}

// MARK: - Guide List Row Skeleton

struct GuideListRowSkeleton: View {
  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      ShimmerView()
        .frame(width: 90, height: 68)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        ShimmerView()
          .frame(height: 16)
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xxs))

        ShimmerView()
          .frame(height: 14)
          .frame(width: 150)
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xxs))

        Spacer()

        HStack {
          ShimmerView()
            .frame(width: 60, height: 12)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xxs))

          Spacer()

          ShimmerView()
            .frame(width: 80, height: 12)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xxs))
        }
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.sm)
  }
}
