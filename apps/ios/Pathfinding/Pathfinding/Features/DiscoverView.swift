import SwiftUI

struct DiscoverView: View {
  @State private var store = GuideStore.shared

  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    NavigationStack {
      ZStack {
        // Explorer background with star field in dark mode
        explorerBackground

        // Content
        if store.isLoading && store.guides.isEmpty {
          loadingView
        } else {
          ScrollView {
            VStack(alignment: .leading, spacing: 0) {
              // Featured section
              if !store.featuredGuides.isEmpty {
                featuredSection
              }

              // Decorated divider between sections
              if !store.featuredGuides.isEmpty && !store.recentGuides.isEmpty {
                ExplorerDivider(style: ExplorerDivider.Style.topographic, color: DesignTokens.Colors.accent)
                  .padding(.horizontal, DesignTokens.Spacing.xl)
                  .padding(.vertical, DesignTokens.Spacing.sm)
              }

              // Recent section
              if !store.recentGuides.isEmpty {
                recentSection
                  .padding(.top, DesignTokens.Spacing.md)
              }
            }
            .padding(.bottom, DesignTokens.Spacing.md)
          }
          .scrollDismissesKeyboard(.interactively)
          .contentMargins(.top, 0, for: .scrollContent)
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

  // MARK: - Explorer Background

  private var explorerBackground: some View {
    ZStack {
      // Base background
      Color(.systemGroupedBackground)
        .ignoresSafeArea()

      // Star field for dark mode (subtle, behind content)
      if colorScheme == .dark {
        StarFieldView(starCount: 30, twinkle: true)
          .opacity(0.4)
          .ignoresSafeArea()
      }

      // Full-page gradient decoration
      LinearGradient(
        colors: [
          DesignTokens.Colors.accent.opacity(colorScheme == .dark ? 0.15 : 0.08),
          DesignTokens.Colors.accent.opacity(colorScheme == .dark ? 0.06 : 0.03),
        ],
        startPoint: .top,
        endPoint: .bottom
      )
      .ignoresSafeArea()

      // Topographic lines (top area)
      VStack {
        TopographicLinesView(
          lineCount: 5,
          lineColor: DesignTokens.Colors.accent.opacity(colorScheme == .dark ? 0.08 : 0.02)
        )
        .frame(height: 400)
        Spacer()
      }
      .ignoresSafeArea()

      // Compass decoration (top-right)
      VStack {
        HStack {
          Spacer()
          CompassRoseDecoration(
            size: 150,
            color: DesignTokens.Colors.accent,
            opacity: colorScheme == .dark ? 0.06 : 0.02
          )
        }
        .padding(.trailing, -30)
        .padding(.top, 50)
        Spacer()
      }
      .ignoresSafeArea()

      // Subtle noise texture
      NoiseTextureOverlay(opacity: colorScheme == .dark ? 0.02 : 0.015)
        .ignoresSafeArea()
    }
  }

  // MARK: - Featured Section

  private var featuredSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // Section header using ExplorerSectionHeader
      ExplorerSectionHeader(
        "discover.featured".localized,
        subtitle: "精选旅行攻略",
        icon: "star.fill",
        accentColor: Color.orange
      )
      .padding(.horizontal, DesignTokens.Spacing.lg)

      // Featured carousel with staggered animation
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: DesignTokens.Spacing.md) {
          ForEach(Array(store.featuredGuides.enumerated()), id: \.element.id) { index, guide in
            NavigationLink(value: guide) {
              ExplorerFeaturedCard(guide: guide)
            }
            .buttonStyle(.plain)
            .staggeredAnimation(index: index, baseDelay: 0.08)
          }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.xs)
      }
      .scrollClipDisabled()
    }
  }

  // MARK: - Recent Section

  private var recentSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // Section header using ExplorerSectionHeader
      ExplorerSectionHeader(
        "discover.recent".localized,
        subtitle: "最近更新",
        icon: "clock.fill",
        accentColor: Color.blue
      )
      .padding(.horizontal, DesignTokens.Spacing.lg)

      LazyVStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(Array(store.recentGuides.enumerated()), id: \.element.id) { index, guide in
          NavigationLink(value: guide) {
            ExplorerGuideRow(guide: guide, index: index)
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, DesignTokens.Spacing.lg)
    }
  }

  // MARK: - Loading View

  private var loadingView: some View {
    ScrollView {
      VStack(spacing: DesignTokens.Spacing.xl) {
        // Explorer loading indicator
        ExplorerLoadingIndicator(message: "探索中...", size: 50)
          .padding(.top, DesignTokens.Spacing.xl)

        // Skeleton cards for visual feedback
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: DesignTokens.Spacing.md) {
            ForEach(0..<3, id: \.self) { index in
              ExplorerFeaturedCardSkeleton()
                .staggeredAnimation(index: index, baseDelay: 0.1)
            }
          }
          .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .scrollClipDisabled()
      }
      .padding(.vertical, DesignTokens.Spacing.md)
    }
  }
}

#Preview {
  DiscoverView()
}
