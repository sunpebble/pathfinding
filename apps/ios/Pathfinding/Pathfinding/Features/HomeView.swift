import SwiftUI

struct HomeView: View {
  @State private var store = GuideStore.shared
  @Namespace private var animation

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
          // MARK: - Hero Header
          heroHeader
            .padding(.horizontal, DesignTokens.Spacing.lg)

          if store.isLoading && store.guides.isEmpty {
            loadingView
          } else if let error = store.error, store.guides.isEmpty {
            errorView(error)
          } else if store.guides.isEmpty {
            emptyView
          } else {
            // MARK: - Featured Section
            if !store.featuredGuides.isEmpty {
              featuredSection
            }

            // MARK: - Recent Guides
            if !store.recentGuides.isEmpty {
              recentSection
            }
          }
        }
        .padding(.vertical, DesignTokens.Spacing.md)
      }
      .background(Color(.systemGroupedBackground))
      .navigationBarTitleDisplayMode(.inline)
      .navigationDestination(for: BlogPost.self) { guide in
        BlogDetailView(guide: guide)
      }
      .task {
        await store.fetchGuides()
      }
      .refreshable {
        await store.fetchGuides(forceRefresh: true)
      }
    }
  }

  // MARK: - Hero Header

  private var heroHeader: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text("发现旅途")
            .font(.system(size: 32, weight: .bold, design: .rounded))

          Text("探索精选攻略，开启下一段旅程")
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }

        Spacer()

        // Profile button
        NavigationLink {
          ProfileView()
        } label: {
          Image(systemName: "person.circle.fill")
            .font(.title)
            .foregroundStyle(.secondary)
        }
      }
    }
    .padding(.top, DesignTokens.Spacing.xs)
  }

  // MARK: - Featured Section

  private var featuredSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      SectionHeader(title: "精选推荐", icon: "star.fill", iconColor: .orange)
        .padding(.horizontal, DesignTokens.Spacing.lg)

      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: DesignTokens.Spacing.md) {
          ForEach(store.featuredGuides) { guide in
            NavigationLink(value: guide) {
              FeaturedCard(guide: guide)
            }
            .buttonStyle(.plain)
          }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
      }
      .scrollClipDisabled()
    }
  }

  // MARK: - Recent Section

  private var recentSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      SectionHeader(title: "最新攻略", icon: "clock.fill", iconColor: .indigo)
        .padding(.horizontal, DesignTokens.Spacing.lg)

      LazyVStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(store.recentGuides) { guide in
          NavigationLink(value: guide) {
            CompactGuideCard(guide: guide)
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, DesignTokens.Spacing.lg)
    }
  }

  // MARK: - Loading View

  private var loadingView: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
      // Featured skeleton
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        SectionHeader(title: "精选推荐", icon: "star.fill", iconColor: .orange)
          .padding(.horizontal, DesignTokens.Spacing.lg)

        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: DesignTokens.Spacing.md) {
            ForEach(0..<3, id: \.self) { _ in
              GuideCardSkeleton()
            }
          }
          .padding(.horizontal, DesignTokens.Spacing.lg)
        }
      }

      // Recent skeleton
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        SectionHeader(title: "最新攻略", icon: "clock.fill", iconColor: .indigo)
          .padding(.horizontal, DesignTokens.Spacing.lg)

        VStack(spacing: DesignTokens.Spacing.sm) {
          ForEach(0..<4, id: \.self) { _ in
            CompactGuideSkeleton()
          }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
      }
    }
  }

  // MARK: - Error View

  private func errorView(_ error: StoreError) -> some View {
    ContentUnavailableView {
      Label("加载失败", systemImage: "wifi.exclamationmark")
    } description: {
      Text(error.localizedDescription)
    } actions: {
      Button("重试") {
        Task { await store.fetchGuides(forceRefresh: true) }
      }
      .buttonStyle(.secondary)
    }
    .frame(minHeight: 300)
    .padding(.horizontal, DesignTokens.Spacing.lg)
  }

  // MARK: - Empty View

  private var emptyView: some View {
    ContentUnavailableView {
      Label("暂无攻略", systemImage: "book.closed")
    } description: {
      Text("下拉刷新加载最新内容")
    }
    .frame(minHeight: 300)
    .padding(.horizontal, DesignTokens.Spacing.lg)
  }
}

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
                colors: [.indigo.opacity(0.3), .purple.opacity(0.2)],
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

#Preview {
  HomeView()
}
