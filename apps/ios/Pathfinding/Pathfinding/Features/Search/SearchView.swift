import SwiftUI

// MARK: - TimeFilter

/// Shared time-range filter used by SearchView (moved from DiscoverView).
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

// MARK: - SearchView

struct SearchView: View {
  @State private var store = GuideStore.shared
  @State private var searchText = ""
  @State private var selectedCity: String? = nil
  @State private var onlyAiGuides = false
  @State private var timeFilter: TimeFilter = .all
  @State private var searchTask: Task<Void, Never>?

  // MARK: - Pure mapping function (testable)

  nonisolated static func makeSearchParams(
    text: String,
    city: String?,
    onlyAI: Bool,
    timeFilter: TimeFilter
  ) -> (query: String, destination: String?, hasAiData: Bool, daysAgo: Int?) {
    (
      query: text,
      destination: (city?.isEmpty == false) ? city : nil,
      hasAiData: onlyAI,
      daysAgo: timeFilter.daysAgo
    )
  }

  // MARK: - Body

  var body: some View {
    NavigationStack {
      Group {
        if store.isSearching {
          VStack(spacing: DesignTokens.Spacing.lg) {
            ExplorerLoadingIndicator(message: "正在搜索...", size: 50)
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if store.searchResults.isEmpty && !searchText.isEmpty {
          ContentUnavailableView.search
        } else {
          List {
            if !store.searchResults.isEmpty {
              Section {
                HStack(spacing: DesignTokens.Spacing.xs) {
                  Image(systemName: "doc.text.magnifyingglass")
                    .foregroundStyle(DesignTokens.Colors.accent)
                  Text("找到 \(store.searchResults.count) 条结果")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                }
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
          }
          .listStyle(.plain)
          .scrollContentBackground(.hidden)
        }
      }
      .navigationTitle("tab.search".localized)
      .navigationBarTitleDisplayMode(.large)
      .searchable(text: $searchText, prompt: "discover.search_placeholder".localized)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          filterMenu
        }
      }
      .navigationDestination(for: BlogPost.self) { guide in
        BlogDetailView(guide: guide)
      }
      .onChange(of: searchText) { _, _ in debouncedSearch() }
      .onChange(of: selectedCity) { _, _ in debouncedSearch() }
      .onChange(of: onlyAiGuides) { _, _ in debouncedSearch() }
      .onChange(of: timeFilter) { _, _ in debouncedSearch() }
      .task {
        await store.fetchPopularDestinations()
      }
    }
  }

  // MARK: - Filter Menu

  private var filterMenu: some View {
    Menu {
      // AI filter toggle
      Toggle(isOn: $onlyAiGuides) {
        Label("仅AI行程", systemImage: "sparkles")
      }

      Divider()

      // City filter
      Menu("目的地") {
        Button("全部") { selectedCity = nil }
        ForEach(store.popularDestinations, id: \.id) { dest in
          Button(dest.name) { selectedCity = dest.name }
        }
      }

      Divider()

      // Time filter
      Menu("时间范围") {
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
      }
    } label: {
      Label("筛选", systemImage: "line.3.horizontal.decrease.circle")
        .symbolVariant(hasActiveFilters ? .fill : .none)
    }
    .accessibilityLabel("搜索筛选器")
  }

  private var hasActiveFilters: Bool {
    selectedCity != nil || onlyAiGuides || timeFilter != .all
  }

  // MARK: - Search Logic

  private func debouncedSearch() {
    searchTask?.cancel()
    searchTask = Task {
      try? await Task.sleep(for: .milliseconds(300))
      guard !Task.isCancelled else { return }
      let p = Self.makeSearchParams(
        text: searchText,
        city: selectedCity,
        onlyAI: onlyAiGuides,
        timeFilter: timeFilter
      )
      await store.search(
        query: p.query,
        destination: p.destination,
        hasAiData: p.hasAiData,
        daysAgo: p.daysAgo
      )
    }
  }
}

#Preview {
  SearchView()
}
