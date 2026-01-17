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
      // Cover Image
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

      // Content
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        Text(guide.title)
          .font(.headline)
          .lineLimit(2)
          .foregroundStyle(.primary)

        if let summary = guide.aiSummary ?? guide.summary {
          Text(summary)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(2)
        }

        HStack(spacing: DesignTokens.Spacing.sm) {
          if let author = guide.author {
            HStack(spacing: 4) {
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
            .fill(Color(.systemGray5))
        }
        .frame(width: 90, height: 68)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))

        // AI indicator
        if guide.aiProcessedAt != nil {
          Circle()
            .fill(Color.aiPurple.gradient)
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

          // Stats
          HStack(spacing: DesignTokens.Spacing.sm) {
            if let views = guide.viewCount, views > 0 {
              StatLabel(icon: "eye", value: formatNumber(views))
            }
            if let likes = guide.likeCount, likes > 0 {
              StatLabel(icon: "heart.fill", value: formatNumber(likes), color: .red.opacity(0.7))
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
          .clipShape(RoundedRectangle(cornerRadius: 4))

        ShimmerView()
          .frame(height: 14)
          .frame(width: 150)
          .clipShape(RoundedRectangle(cornerRadius: 4))

        Spacer()

        HStack {
          ShimmerView()
            .frame(width: 60, height: 12)
            .clipShape(RoundedRectangle(cornerRadius: 4))

          Spacer()

          ShimmerView()
            .frame(width: 80, height: 12)
            .clipShape(RoundedRectangle(cornerRadius: 4))
        }
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.sm)
  }
}
