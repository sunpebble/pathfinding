import SwiftUI

struct DiscoverView: View {
  @State private var store = GuideStore.shared
  @State private var searchText = ""
  @State private var selectedCity: String? = nil
  @State private var onlyAiGuides = false
  @State private var timeFilter: TimeFilter = .all
  @State private var searchTask: Task<Void, Never>?

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
      VStack(spacing: 0) {
        // Filter bar
        filterBar
          .padding(.horizontal, DesignTokens.Spacing.md)
          .padding(.vertical, DesignTokens.Spacing.sm)
          .background(Color(.systemBackground))

        // Content
        if store.isLoading && store.guides.isEmpty {
          loadingView
        } else if isSearchMode {
          searchResultsView
        } else {
          cardLayoutView
        }
      }
      .background(Color(.systemGroupedBackground))
      .navigationTitle("discover.title".localized)
      .navigationBarTitleDisplayMode(.large)
      .searchable(text: $searchText, prompt: "discover.search_placeholder".localized)
      .onChange(of: searchText) { _, newValue in
        triggerSearch()
      }
      .onChange(of: selectedCity) { _, _ in triggerSearch() }
      .onChange(of: onlyAiGuides) { _, _ in triggerSearch() }
      .onChange(of: timeFilter) { _, _ in triggerSearch() }
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

  // MARK: - Filter Bar

  private var filterBar: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      // City tags
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: DesignTokens.Spacing.xs) {
          cityTag(nil, label: "全部")
          ForEach(store.popularDestinations) { dest in
            cityTag(dest.name, label: dest.name)
          }
        }
      }

      // Filter buttons
      HStack(spacing: DesignTokens.Spacing.md) {
        Toggle(isOn: $onlyAiGuides) {
          Label("仅AI行程", systemImage: "sparkles")
            .font(.subheadline)
        }
        .toggleStyle(.button)
        .buttonStyle(.bordered)
        .tint(onlyAiGuides ? .indigo : .secondary)

        Menu {
          ForEach(TimeFilter.allCases, id: \.self) { filter in
            Button {
              timeFilter = filter
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
        .tint(timeFilter != .all ? .indigo : .secondary)

        Spacer()
      }
    }
  }

  private func cityTag(_ city: String?, label: String) -> some View {
    Button {
      withAnimation { selectedCity = city }
    } label: {
      Text(label)
        .font(.subheadline)
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(selectedCity == city ? Color.indigo : Color(.systemGray5))
        .foregroundStyle(selectedCity == city ? .white : .primary)
        .clipShape(Capsule())
    }
    .buttonStyle(.plain)
  }

  // MARK: - Card Layout (Default)

  private var cardLayoutView: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xl) {
        // Featured section
        if !store.featuredGuides.isEmpty {
          featuredSection
        }

        // Recent section
        if !store.recentGuides.isEmpty {
          recentSection
        }
      }
      .padding(.vertical, DesignTokens.Spacing.md)
    }
  }

  private var featuredSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      SectionHeader(title: "discover.featured".localized, icon: "star.fill", iconColor: .orange)
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

  private var recentSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      SectionHeader(title: "discover.recent".localized, icon: "clock.fill", iconColor: .blue)
        .padding(.horizontal, DesignTokens.Spacing.lg)

      LazyVStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(store.recentGuides) { guide in
          NavigationLink(value: guide) {
            GuideListRow(guide: guide)
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
        ProgressView()
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else if store.searchResults.isEmpty {
        ContentUnavailableView(
          "无搜索结果",
          systemImage: "magnifyingglass",
          description: Text("尝试调整搜索条件")
        )
      } else {
        List {
          Section {
            Text("找到 \(store.searchResults.count) 条结果")
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
          .listRowBackground(Color.clear)

          ForEach(store.searchResults) { guide in
            NavigationLink(value: guide) {
              GuideListRow(guide: guide)
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

  // MARK: - Loading

  private var loadingView: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      ProgressView()
      Text("加载中...")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
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
