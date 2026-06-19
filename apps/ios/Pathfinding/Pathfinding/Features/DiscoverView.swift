import SwiftUI

struct DiscoverView: View {
  @State private var store = GuideStore.shared

  var body: some View {
    NavigationStack {
      Group {
        if store.isLoading && store.guides.isEmpty {
          loadingView
        } else if store.guides.isEmpty {
          ContentUnavailableView(
            "discover.featured".localized,
            systemImage: "map",
            description: Text("guides.empty_description".localized)
          )
        } else {
          feedList
        }
      }
      .navigationTitle("discover.title".localized)
      .navigationBarTitleDisplayMode(.large)
      .navigationDestination(for: BlogPost.self) { guide in
        BlogDetailView(guide: guide)
      }
      .task {
        await store.fetchGuides()
        await store.fetchPopularDestinations()
      }
      .refreshable {
        await store.fetchGuides(forceRefresh: true)
      }
    }
  }

  // MARK: - Feed List

  private var feedList: some View {
    List {
      // MARK: Featured Section
      if !store.featuredGuides.isEmpty {
        Section {
          ScrollView(.horizontal, showsIndicators: false) {
            GlassEffectContainer {
              HStack(spacing: DesignTokens.Spacing.md) {
                ForEach(store.featuredGuides) { guide in
                  NavigationLink(value: guide) {
                    FeaturedGuideCardContent(guide: guide)
                      .frame(width: 300)
                      .padding(DesignTokens.Spacing.sm)
                      .cardSurface(cornerRadius: DesignTokens.Radius.lg)
                  }
                  .buttonStyle(.glass)
                }
              }
              .padding(.horizontal, DesignTokens.Spacing.md)
              .padding(.vertical, DesignTokens.Spacing.xs)
            }
          }
          .scrollClipDisabled()
          .listRowInsets(EdgeInsets())
          .listRowBackground(Color.clear)
          .listRowSeparator(.hidden)
        } header: {
          Text("discover.featured".localized)
            .font(.title3)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
            .textCase(nil)
        }
      }

      // MARK: Recent Section
      if !store.recentGuides.isEmpty {
        Section {
          ForEach(store.recentGuides) { guide in
            NavigationLink(value: guide) {
              GuideRowContent(guide: guide)
            }
            .accessibilityLabel(guide.title)
          }
        } header: {
          Text("discover.recent".localized)
            .font(.title3)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
            .textCase(nil)
        }
      }
    }
    .listStyle(.insetGrouped)
  }

  // MARK: - Loading View

  private var loadingView: some View {
    List {
      Section {
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: DesignTokens.Spacing.md) {
            ForEach(0..<3, id: \.self) { _ in
              FeaturedGuideCardContent(guide: BlogPost.placeholder)
                .frame(width: 300)
                .padding(DesignTokens.Spacing.sm)
                .redacted(reason: .placeholder)
            }
          }
          .padding(.horizontal, DesignTokens.Spacing.md)
          .padding(.vertical, DesignTokens.Spacing.xs)
        }
        .scrollClipDisabled()
        .listRowInsets(EdgeInsets())
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
      } header: {
        Text("discover.featured".localized)
          .font(.title3).fontWeight(.bold).foregroundStyle(.primary).textCase(nil)
      }

      Section {
        ForEach(0..<5, id: \.self) { _ in
          GuideRowContent(guide: BlogPost.placeholder)
            .redacted(reason: .placeholder)
        }
      } header: {
        Text("discover.recent".localized)
          .font(.title3).fontWeight(.bold).foregroundStyle(.primary).textCase(nil)
      }
    }
    .listStyle(.insetGrouped)
    .allowsHitTesting(false)
  }
}

// MARK: - FeaturedGuideCardContent

/// Glass-friendly card content for the featured carousel.
/// Applied after frame+padding — `.cardSurface` is called at the call site.
struct FeaturedGuideCardContent: View {
  let guide: BlogPost

  private var themeColor: Color {
    guard let destination = guide.destinations?.first else { return .accentColor }
    let colors: [Color] = [.indigo, .teal, .orange, .purple, .pink, .cyan]
    return colors[abs(destination.hashValue) % colors.count]
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      // Cover image
      CachedAsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
        image.resizable().aspectRatio(contentMode: .fill)
      } placeholder: {
        ZStack {
          LinearGradient(
            colors: [themeColor.opacity(0.4), themeColor.opacity(0.2)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
          Image(systemName: "map")
            .font(.system(size: 40))
            .foregroundStyle(.white.opacity(0.4))
        }
      }
      .frame(height: 180)
      .clipped()

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        // Destination tags
        if let destinations = guide.destinations, !destinations.isEmpty {
          ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.xxs) {
              ForEach(destinations.prefix(3), id: \.self) { dest in
                Text(dest)
                  .font(.caption2)
                  .fontWeight(.medium)
                  .padding(.horizontal, DesignTokens.Spacing.sm)
                  .padding(.vertical, DesignTokens.Spacing.xxs)
                  .background(themeColor.opacity(0.12))
                  .foregroundStyle(themeColor)
                  .clipShape(Capsule())
              }
            }
          }
        }

        // Title
        Text(guide.title)
          .font(.headline)
          .fontWeight(.bold)
          .lineLimit(2)
          .foregroundStyle(.primary)

        // Stats row
        HStack(spacing: DesignTokens.Spacing.sm) {
          if let author = guide.author {
            HStack(spacing: DesignTokens.Spacing.xxs) {
              Image(systemName: "person.circle.fill")
                .foregroundStyle(themeColor.opacity(0.7))
              Text(author).lineLimit(1)
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

        // AI badge (flat, glass-tinted capsule — no nested card)
        if guide.aiProcessedAt != nil {
          Label("guide.ai".localized, systemImage: "sparkles")
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .glassEffect(.regular.tint(.purple), in: .capsule)
        }
      }
      .padding(DesignTokens.Spacing.md)
    }
    .accessibilityElement(children: .combine)
    .accessibilityLabel(accessibilityLabel)
  }

  private var accessibilityLabel: String {
    var parts = [guide.title]
    if let author = guide.author { parts.append("作者 \(author)") }
    if let destinations = guide.destinations, !destinations.isEmpty {
      parts.append("目的地 \(destinations.prefix(3).joined(separator: "、"))")
    }
    return parts.joined(separator: "，")
  }

  private func formatNumber(_ num: Int) -> String {
    if num >= 10000 { return String(format: "%.1fw", Double(num) / 10000) }
    if num >= 1000 { return String(format: "%.1fk", Double(num) / 1000) }
    return "\(num)"
  }
}

// MARK: - GuideRowContent

/// List row content — NO explicit glass (List rows auto-glassify in iOS 26).
struct GuideRowContent: View {
  let guide: BlogPost

  private var themeColor: Color {
    guard let destination = guide.destinations?.first else { return .accentColor }
    let colors: [Color] = [.indigo, .teal, .orange, .purple, .pink, .cyan]
    return colors[abs(destination.hashValue) % colors.count]
  }

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Thumbnail
      CachedAsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
        image.resizable().aspectRatio(contentMode: .fill)
      } placeholder: {
        ZStack {
          LinearGradient(
            colors: [themeColor.opacity(0.3), themeColor.opacity(0.15)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
          Image(systemName: "map")
            .font(.system(size: 20))
            .foregroundStyle(.white.opacity(0.4))
        }
      }
      .frame(width: 80, height: 60)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
        Text(guide.title)
          .font(.subheadline)
          .fontWeight(.semibold)
          .lineLimit(2)
          .foregroundStyle(.primary)

        HStack(spacing: DesignTokens.Spacing.xs) {
          if let author = guide.author {
            Text(author).lineLimit(1)
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

        // AI signal — flat tinted glass capsule, no card wrapper
        if guide.aiProcessedAt != nil {
          Label("guide.ai".localized, systemImage: "sparkles")
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .glassEffect(.regular.tint(.purple), in: .capsule)
        }
      }
    }
    .accessibilityElement(children: .combine)
    .accessibilityLabel(guide.title)
  }

  private func formatNumber(_ num: Int) -> String {
    if num >= 10000 { return String(format: "%.1fw", Double(num) / 10000) }
    if num >= 1000 { return String(format: "%.1fk", Double(num) / 1000) }
    return "\(num)"
  }
}

// MARK: - BlogPost placeholder helper

private extension BlogPost {
  static let placeholder = BlogPost(
    id: "placeholder",
    title: "Loading guide title here placeholder",
    authorName: "Author Name",
    content: nil,
    contentHtml: nil,
    contentMarkdown: nil,
    summary: nil,
    coverImageUrl: nil,
    imageUrls: nil,
    sourcePlatform: nil,
    qualityScore: nil,
    viewsCount: 1234,
    likesCount: 56,
    savesCount: nil,
    createdAt: nil,
    destinations: ["Destination"],
    aiSummary: nil,
    aiTips: nil,
    aiBestTime: nil,
    aiDuration: nil,
    aiBudget: nil,
    aiDays: nil,
    aiProcessedAt: nil
  )
}

#Preview {
  DiscoverView()
}
