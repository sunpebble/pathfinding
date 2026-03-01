import SwiftUI

struct DiscoverView: View {
  @State private var store = GuideStore.shared
  @State private var searchText = ""
  @State private var selectedCity: String? = nil
  @State private var onlyAiGuides = false
  @State private var timeFilter: TimeFilter = .all
  @State private var searchTask: Task<Void, Never>?
  @State private var showModeTransition = false

  @Environment(\.colorScheme) private var colorScheme

  enum TimeFilter: String, CaseIterable {
    case all = "全部"
    case week = "一周内"
    case month = "一月内"
    case threeMonths = "三月内"

    var daysAgo: Int? {
      switch self {
      case .all: return nil
      case .week: return 7
      case .month: return 30
      case .threeMonths: return 90
      }
    }
  }

  var isSearchMode: Bool {
    !searchText.isEmpty || selectedCity != nil || onlyAiGuides || timeFilter != .all
  }

  var body: some View {
    NavigationStack {
      ZStack {
        // Explorer background with star field in dark mode
        explorerBackground

        VStack(spacing: 0) {
          // Enhanced filter bar
          filterBar
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(filterBarBackground)

          // Content with reveal animation
          if store.isLoading && store.guides.isEmpty {
            loadingView
          } else if isSearchMode {
            searchResultsView
              .transition(.asymmetric(
                insertion: .opacity.combined(with: .move(edge: .trailing)),
                removal: .opacity.combined(with: .move(edge: .leading))
              ))
          } else {
            cardLayoutView
              .transition(.asymmetric(
                insertion: .opacity.combined(with: .move(edge: .leading)),
                removal: .opacity.combined(with: .move(edge: .trailing))
              ))
          }
        }
      }
      .navigationTitle("discover.title".localized)
      .navigationBarTitleDisplayMode(.large)
      .searchable(text: $searchText, prompt: "discover.search_placeholder".localized)
      .onChange(of: searchText) { _, newValue in
        triggerSearch()
      }
      .onChange(of: selectedCity) { _, _ in
        withAnimation { showModeTransition.toggle() }
        triggerSearch()
      }
      .onChange(of: onlyAiGuides) { _, _ in
        withAnimation { showModeTransition.toggle() }
        triggerSearch()
      }
      .onChange(of: timeFilter) { _, _ in
        withAnimation { showModeTransition.toggle() }
        triggerSearch()
      }
      .navigationDestination(for: BlogPost.self) { guide in
        BlogDetailView(guide: guide)
      }
      .task {
        await store.fetchGuides()
        await store.fetchPopularDestinations()
      }
      .refreshable {
        if isSearchMode {
          await performSearch()
        } else {
          await store.fetchGuides(forceRefresh: true)
        }
      }
    }
  }

  // MARK: - Filter Bar Background

  private var filterBarBackground: some View {
    ZStack {
      // Material background
      Rectangle()
        .fill(.ultraThinMaterial)

      // Subtle bottom border
      VStack {
        Spacer()
        Rectangle()
          .fill(
            LinearGradient(
              colors: [
                DesignTokens.Colors.accent.opacity(colorScheme == .dark ? 0.3 : 0.15),
                DesignTokens.Colors.accent.opacity(0)
              ],
              startPoint: .leading,
              endPoint: .trailing
            )
          )
          .frame(height: 1)
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

      // Top gradient decoration
      VStack {
        ZStack {
          // Gradient
          LinearGradient(
            colors: [
              DesignTokens.Colors.accent.opacity(colorScheme == .dark ? 0.15 : 0.08),
              .clear
            ],
            startPoint: .top,
            endPoint: .bottom
          )
          .frame(height: 300)

          // Topographic lines
          TopographicLinesView(
            lineCount: 5,
            lineColor: DesignTokens.Colors.accent.opacity(colorScheme == .dark ? 0.08 : 0.02)
          )
          .frame(height: 300)

          // Compass decoration
          HStack {
            Spacer()
            VStack {
              CompassRoseDecoration(
                size: 150,
                color: DesignTokens.Colors.accent,
                opacity: colorScheme == .dark ? 0.06 : 0.02
              )
              Spacer()
            }
          }
          .padding(.trailing, -30)
          .padding(.top, 50)
        }

        Spacer()
      }
      .ignoresSafeArea()

      // Subtle noise texture
      NoiseTextureOverlay(opacity: colorScheme == .dark ? 0.02 : 0.015)
        .ignoresSafeArea()
    }
  }

  // MARK: - Filter Bar

  private var filterBar: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      // City tags as DestinationBadge components with staggered animation
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: DesignTokens.Spacing.xs) {
          // "All" badge
          destinationFilterBadge(nil, label: "全部", index: 0)

          // Popular destinations
          ForEach(Array(store.popularDestinations.enumerated()), id: \.element.id) { index, dest in
            destinationFilterBadge(dest.name, label: dest.name, index: index + 1)
          }
        }
        .padding(.horizontal, DesignTokens.Spacing.xxs)
      }

      // Filter buttons with enhanced styling
      HStack(spacing: DesignTokens.Spacing.md) {
        // AI Toggle with breathing animation when active
        aiFilterToggle

        // Time filter menu
        timeFilterMenu

        Spacer()
      }
    }
  }

  // MARK: - AI Filter Toggle

  private var aiFilterToggle: some View {
    Toggle(isOn: $onlyAiGuides) {
      HStack(spacing: DesignTokens.Spacing.xxs) {
        Image(systemName: "sparkles")
          .symbolEffect(.pulse, options: .repeating, isActive: onlyAiGuides)
        Text("仅AI行程")
      }
      .font(.subheadline)
    }
    .toggleStyle(.button)
    .buttonStyle(.bordered)
    .tint(onlyAiGuides ? .purple : .secondary)
    .sensoryFeedback(.selection, trigger: onlyAiGuides)
    .overlay {
      if onlyAiGuides && colorScheme == .dark {
        RoundedRectangle(cornerRadius: 8)
          .stroke(Color.purple.opacity(0.5), lineWidth: 1)
          .shadow(color: .purple.opacity(0.3), radius: 8, y: 0)
      }
    }
  }

  // MARK: - Time Filter Menu

  private var timeFilterMenu: some View {
    Menu {
      ForEach(TimeFilter.allCases, id: \.self) { filter in
        Button {
          withAnimation(.spring(response: 0.3)) {
            timeFilter = filter
          }
        } label: {
          HStack {
            Text(filter.rawValue)
            if timeFilter == filter {
              Image(systemName: "checkmark")
            }
          }
        }
      }
    } label: {
      Label(timeFilter.rawValue, systemImage: "calendar")
        .font(.subheadline)
    }
    .buttonStyle(.bordered)
    .tint(timeFilter != .all ? DesignTokens.Colors.accent : .secondary)
    .sensoryFeedback(.selection, trigger: timeFilter)
  }

  // MARK: - Destination Filter Badge

  private func destinationFilterBadge(_ city: String?, label: String, index: Int) -> some View {
    Button {
      withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
        selectedCity = city
      }
    } label: {
      let isSelected = selectedCity == city
      HStack(spacing: 4) {
        if city != nil {
          Image(systemName: terrainIcon(for: label))
            .font(.system(size: 10))
        }
        Text(label)
          .font(.caption)
          .fontWeight(.medium)
      }
      .padding(.horizontal, DesignTokens.Spacing.sm)
      .padding(.vertical, DesignTokens.Spacing.xs)
      .background(
        Group {
          if isSelected {
            LinearGradient(
              colors: [
                DesignTokens.Colors.accent,
                DesignTokens.Colors.accent.opacity(0.8)
              ],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          } else {
            DesignTokens.Colors.fillTertiary
          }
        }
      )
      .foregroundStyle(isSelected ? .white : .primary)
      .clipShape(Capsule())
      .overlay {
        if isSelected && colorScheme == .dark {
          Capsule()
            .stroke(DesignTokens.Colors.accent.opacity(0.5), lineWidth: 1)
        }
      }
      .shadow(
        color: isSelected && colorScheme == .dark ? DesignTokens.Colors.accent.opacity(0.3) : .clear,
        radius: 6,
        y: 2
      )
    }
    .buttonStyle(.plain)
    .sensoryFeedback(.selection, trigger: selectedCity == city)
    .staggeredAnimation(index: index, baseDelay: 0.02)
  }

  // Generate terrain icon based on destination name
  private func terrainIcon(for destination: String) -> String {
    let hash = abs(destination.hashValue)
    let icons = ["mountain.2", "water.waves", "tree", "building.2", "sun.max", "leaf"]
    return icons[hash % icons.count]
  }

  // MARK: - Card Layout (Default)

  private var cardLayoutView: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
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
        }
      }
      .padding(.vertical, DesignTokens.Spacing.md)
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

  // MARK: - Search Results

  private var searchResultsView: some View {
    Group {
      if store.isSearching {
        // Explorer-themed loading indicator
        VStack(spacing: DesignTokens.Spacing.lg) {
          ExplorerLoadingIndicator(message: "正在搜索...", size: 50)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else if store.searchResults.isEmpty {
        // Explorer-themed empty state
        ExplorerEmptyState(
          icon: "magnifyingglass",
          title: "无搜索结果",
          message: "尝试调整搜索条件或筛选器",
          actionLabel: "清除筛选",
          action: {
            withAnimation(.spring(response: 0.3)) {
              searchText = ""
              selectedCity = nil
              onlyAiGuides = false
              timeFilter = .all
            }
          }
        )
        .slideIn(from: .bottom, duration: 0.4)
      } else {
        List {
          // Results count header
          Section {
            HStack(spacing: DesignTokens.Spacing.xs) {
              Image(systemName: "doc.text.magnifyingglass")
                .foregroundStyle(DesignTokens.Colors.accent)
              Text("找到 \(store.searchResults.count) 条结果")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
            .slideIn(from: .leading, duration: 0.3)
          }
          .listRowBackground(Color.clear)

          ForEach(Array(store.searchResults.enumerated()), id: \.element.id) { index, guide in
            NavigationLink(value: guide) {
              ExplorerGuideRow(guide: guide, index: index)
            }
            .listRowSeparator(.hidden)
            .listRowBackground(Color.clear)
          }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
      }
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

  // MARK: - Search Logic

  private func triggerSearch() {
    searchTask?.cancel()
    searchTask = Task {
      try? await Task.sleep(for: .milliseconds(300))
      guard !Task.isCancelled else { return }
      await performSearch()
    }
  }

  private func performSearch() async {
    await store.search(
      query: searchText,
      destination: selectedCity,
      hasAiData: onlyAiGuides,
      daysAgo: timeFilter.daysAgo
    )
  }
}

#Preview {
  DiscoverView()
}
