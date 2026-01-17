# Discover Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge Home and Guides tabs into a unified "Discover" page with full-text search and filters.

**Architecture:** Create DiscoverView combining card layout (default) and list layout (search mode). Add Convex search index for full-text search. Remove BlogListView and rename Home tab to Discover.

**Tech Stack:** SwiftUI, Convex (search indexes), TypeScript

---

## Task 1: Add Convex Search Index for travelGuides

**Files:**

- Modify: `convex/schema.ts:1001-1005`

**Step 1: Add search index to travelGuides table**

In `convex/schema.ts`, after line 1005 (after `.index('by_destinations', ['destinations'])`), add:

```typescript
    .searchIndex('search_content', {
      searchField: 'content',
      filterFields: ['destinations', 'aiProcessedAt'],
    })
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['destinations', 'aiProcessedAt'],
    }),
```

**Step 2: Deploy schema changes**

Run: `npx convex deploy --yes`
Expected: Schema deployed successfully

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(convex): add search indexes for travelGuides"
```

---

## Task 2: Add Convex Search Query

**Files:**

- Modify: `convex/travelGuides.ts`

**Step 1: Add search query function**

Add after the existing `list` query (around line 53):

```typescript
// Search travel guides with filters
export const search = query({
  args: {
    query: v.optional(v.string()),
    destination: v.optional(v.string()),
    hasAiData: v.optional(v.boolean()),
    daysAgo: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const effectiveLimit = args.limit || 50;
    let guides;

    // If query is provided, use search index
    if (args.query && args.query.trim().length > 0) {
      guides = await ctx.db
        .query('travelGuides')
        .withSearchIndex('search_title', (q) => q.search('title', args.query!))
        .take(effectiveLimit * 2);
    } else {
      guides = await ctx.db
        .query('travelGuides')
        .order('desc')
        .take(effectiveLimit * 2);
    }

    // Apply filters
    if (args.destination) {
      guides = guides.filter((g) =>
        g.destinations.some((d) =>
          d.toLowerCase().includes(args.destination!.toLowerCase())
        )
      );
    }

    if (args.hasAiData) {
      guides = guides.filter((g) => g.aiProcessedAt !== undefined);
    }

    if (args.daysAgo) {
      const cutoffTime = Date.now() - args.daysAgo * 24 * 60 * 60 * 1000;
      guides = guides.filter((g) => g.crawledAt >= cutoffTime);
    }

    return guides.slice(0, effectiveLimit);
  },
});

// Get popular destinations from guides
export const getPopularDestinations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const guides = await ctx.db.query('travelGuides').take(500);

    // Count destination occurrences
    const destCounts: Record<string, number> = {};
    for (const guide of guides) {
      for (const dest of guide.destinations) {
        destCounts[dest] = (destCounts[dest] || 0) + 1;
      }
    }

    // Sort by count and return top destinations
    return Object.entries(destCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  },
});
```

**Step 2: Verify types compile**

Run: `pnpm typecheck`
Expected: Successfully ran target typecheck

**Step 3: Commit**

```bash
git add convex/travelGuides.ts
git commit -m "feat(convex): add search and getPopularDestinations queries"
```

---

## Task 3: Add HTTP Action for Search

**Files:**

- Modify: `convex/http.ts`

**Step 1: Add search endpoint**

Add after the existing `/api/guides` GET route:

```typescript
/**
 * GET /api/guides/search
 * Search guides with filters
 */
http.route({
  path: '/api/guides/search',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || undefined;
    const destination = url.searchParams.get('destination') || undefined;
    const hasAiData = url.searchParams.get('hasAiData') === 'true' || undefined;
    const daysAgo = url.searchParams.get('daysAgo')
      ? Number.parseInt(url.searchParams.get('daysAgo')!)
      : undefined;
    const limit = url.searchParams.get('limit')
      ? Number.parseInt(url.searchParams.get('limit')!)
      : 30;

    try {
      const guides = await ctx.runQuery(api.travelGuides.search, {
        query,
        destination,
        hasAiData,
        daysAgo,
        limit,
      });

      const converted = guides.map(convertKeysToSnakeCase);

      return jsonResponse({
        data: converted,
        pagination: {
          total: converted.length,
          limit,
          offset: 0,
        },
      });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '搜索失败',
        500
      );
    }
  }),
});

/**
 * GET /api/guides/destinations
 * Get popular destinations
 */
http.route({
  path: '/api/guides/destinations',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit')
      ? Number.parseInt(url.searchParams.get('limit')!)
      : 10;

    try {
      const destinations = await ctx.runQuery(
        api.travelGuides.getPopularDestinations,
        { limit }
      );

      return jsonResponse({ data: destinations });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : '获取目的地失败',
        500
      );
    }
  }),
});
```

**Step 2: Deploy and test**

Run: `npx convex deploy --yes`
Expected: Deployed successfully

Run: `curl -s "https://convex.kunish.org/http/api/guides/destinations" | head -c 500`
Expected: JSON with destination data

**Step 3: Commit**

```bash
git add convex/http.ts
git commit -m "feat(api): add search and destinations endpoints"
```

---

## Task 4: Update iOS APIClient for Search

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Core/APIClient.swift`

**Step 1: Add search method to APIClient**

Add after the existing `fetchGuides` method:

```swift
  /// Search guides with filters
  func searchGuides(
    query: String? = nil,
    destination: String? = nil,
    hasAiData: Bool? = nil,
    daysAgo: Int? = nil,
    limit: Int = 30
  ) async throws -> [BlogPost] {
    var components = URLComponents(string: "/api/guides/search")!
    var queryItems: [URLQueryItem] = []

    if let query = query, !query.isEmpty {
      queryItems.append(URLQueryItem(name: "q", value: query))
    }
    if let destination = destination {
      queryItems.append(URLQueryItem(name: "destination", value: destination))
    }
    if let hasAiData = hasAiData, hasAiData {
      queryItems.append(URLQueryItem(name: "hasAiData", value: "true"))
    }
    if let daysAgo = daysAgo {
      queryItems.append(URLQueryItem(name: "daysAgo", value: String(daysAgo)))
    }
    queryItems.append(URLQueryItem(name: "limit", value: String(limit)))

    components.queryItems = queryItems

    let response: BlogListResponse = try await request(
      path: components.string!,
      method: "GET"
    )
    return response.data
  }

  /// Fetch popular destinations
  func fetchPopularDestinations(limit: Int = 10) async throws -> [PopularDestination] {
    struct Response: Codable {
      let data: [PopularDestination]
    }
    let response: Response = try await request(
      path: "/api/guides/destinations?limit=\(limit)",
      method: "GET"
    )
    return response.data
  }
```

**Step 2: Add PopularDestination model to BlogPost.swift**

Add at the end of the file:

```swift
// MARK: - Popular Destination

struct PopularDestination: Codable, Identifiable, Hashable {
  var id: String { name }
  let name: String
  let count: Int
}
```

**Step 3: Build to verify**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add apps/ios/Pathfinding/Pathfinding/Core/APIClient.swift
git add apps/ios/Pathfinding/Pathfinding/Models/BlogPost.swift
git commit -m "feat(ios): add search and destinations API methods"
```

---

## Task 5: Update GuideStore for Search

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Core/GuideStore.swift`

**Step 1: Add search state and methods**

Add after the existing properties (around line 14):

```swift
  // Search state
  private(set) var searchResults: [BlogPost] = []
  private(set) var popularDestinations: [PopularDestination] = []
  private(set) var isSearching = false
```

Add after the existing methods:

```swift
  // MARK: - Search

  /// Search guides with filters
  func search(
    query: String = "",
    destination: String? = nil,
    hasAiData: Bool = false,
    daysAgo: Int? = nil
  ) async {
    guard !isSearching else { return }

    isSearching = true

    do {
      searchResults = try await APIClient.shared.searchGuides(
        query: query.isEmpty ? nil : query,
        destination: destination,
        hasAiData: hasAiData ? true : nil,
        daysAgo: daysAgo
      )
      logger.info("Search returned \(self.searchResults.count) results")
    } catch {
      logger.error("Search error: \(error.localizedDescription)")
      searchResults = []
    }

    isSearching = false
  }

  /// Fetch popular destinations
  func fetchPopularDestinations() async {
    do {
      popularDestinations = try await APIClient.shared.fetchPopularDestinations()
      logger.info("Fetched \(self.popularDestinations.count) popular destinations")
    } catch {
      logger.error("Fetch destinations error: \(error.localizedDescription)")
    }
  }

  /// Clear search results
  func clearSearch() {
    searchResults = []
  }
```

**Step 2: Build to verify**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add apps/ios/Pathfinding/Pathfinding/Core/GuideStore.swift
git commit -m "feat(ios): add search methods to GuideStore"
```

---

## Task 6: Create DiscoverView

**Files:**

- Create: `apps/ios/Pathfinding/Pathfinding/Features/DiscoverView.swift`

**Step 1: Create DiscoverView.swift**

Create the file with content:

```swift
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
```

**Step 2: Build to verify**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add apps/ios/Pathfinding/Pathfinding/Features/DiscoverView.swift
git commit -m "feat(ios): add DiscoverView with search and filters"
```

---

## Task 7: Update ContentView Tab Structure

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/ContentView.swift`

**Step 1: Update Tab enum**

Replace the Tab enum (lines 4-40) with:

```swift
enum Tab: String, CaseIterable {
  case discover
  case chat
  case itinerary
  case profile

  var title: String {
    switch self {
    case .discover: return "tab.discover".localized
    case .chat: return "tab.chat".localized
    case .itinerary: return "tab.itinerary".localized
    case .profile: return "tab.profile".localized
    }
  }

  var icon: String {
    switch self {
    case .discover: return "sparkle.magnifyingglass"
    case .chat: return "bubble.left.and.bubble.right"
    case .itinerary: return "map"
    case .profile: return "person"
    }
  }

  var selectedIcon: String {
    switch self {
    case .discover: return "sparkle.magnifyingglass"
    case .chat: return "bubble.left.and.bubble.right.fill"
    case .itinerary: return "map.fill"
    case .profile: return "person.fill"
    }
  }
}
```

**Step 2: Update AppState default tab**

Change line 44:

```swift
  var selectedTab: Tab = .discover
```

**Step 3: Update TabView body**

Replace the TabView content (lines 52-82) with:

```swift
    TabView(selection: $appState.selectedTab) {
      DiscoverView()
        .tag(Tab.discover)
        .tabItem {
          Label(Tab.discover.title, systemImage: appState.selectedTab == .discover ? Tab.discover.selectedIcon : Tab.discover.icon)
        }

      ChatSessionListView(userId: AuthManager.shared.currentUserId ?? "guest")
        .tag(Tab.chat)
        .tabItem {
          Label(Tab.chat.title, systemImage: appState.selectedTab == .chat ? Tab.chat.selectedIcon : Tab.chat.icon)
        }

      ItineraryListView()
        .tag(Tab.itinerary)
        .tabItem {
          Label(Tab.itinerary.title, systemImage: appState.selectedTab == .itinerary ? Tab.itinerary.selectedIcon : Tab.itinerary.icon)
        }

      ProfileView()
        .tag(Tab.profile)
        .tabItem {
          Label(Tab.profile.title, systemImage: appState.selectedTab == .profile ? Tab.profile.selectedIcon : Tab.profile.icon)
        }
    }
```

**Step 4: Build to verify**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 5: Commit**

```bash
git add apps/ios/Pathfinding/Pathfinding/ContentView.swift
git commit -m "feat(ios): update ContentView to use DiscoverView, remove guides tab"
```

---

## Task 8: Update Localizable.strings

**Files:**

- Modify: `apps/ios/Pathfinding/Pathfinding/Resources/en.lproj/Localizable.strings`
- Modify: `apps/ios/Pathfinding/Pathfinding/Resources/zh-Hans.lproj/Localizable.strings`

**Step 1: Update English strings**

Replace tab entries and add discover strings:

```
// Tabs
"tab.discover" = "Discover";
"tab.chat" = "Assistant";
"tab.itinerary" = "Itinerary";
"tab.profile" = "Profile";

// Discover
"discover.title" = "Discover";
"discover.search_placeholder" = "Search destinations, guides...";
"discover.featured" = "Featured";
"discover.recent" = "Recent";
```

**Step 2: Update Chinese strings**

```
// Tabs
"tab.discover" = "发现";
"tab.chat" = "助手";
"tab.itinerary" = "行程";
"tab.profile" = "我的";

// Discover
"discover.title" = "发现";
"discover.search_placeholder" = "搜索目的地、攻略...";
"discover.featured" = "精选攻略";
"discover.recent" = "最近更新";
```

**Step 3: Build to verify**

Run: `pnpm ios:build 2>&1 | tail -5`
Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add apps/ios/Pathfinding/Pathfinding/Resources/
git commit -m "feat(ios): add discover page localization strings"
```

---

## Task 9: Delete Old Files

**Files:**

- Delete: `apps/ios/Pathfinding/Pathfinding/Features/HomeView.swift`
- Delete: `apps/ios/Pathfinding/Pathfinding/Features/BlogListView.swift`

**Step 1: Delete old files**

```bash
rm apps/ios/Pathfinding/Pathfinding/Features/HomeView.swift
rm apps/ios/Pathfinding/Pathfinding/Features/BlogListView.swift
```

**Step 2: Build to verify no broken references**

Run: `pnpm ios:build 2>&1 | tail -10`
Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add -A
git commit -m "chore(ios): remove HomeView and BlogListView (merged into DiscoverView)"
```

---

## Task 10: Final Integration Test

**Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: Successfully ran target typecheck

**Step 2: Build and launch iOS app**

Run: `pnpm ios`
Expected: App launches in simulator

**Step 3: Manual verification checklist**

- [ ] Discover tab shows card layout by default
- [ ] Search bar is visible
- [ ] City tags are displayed
- [ ] Typing in search switches to list view
- [ ] Selecting a city filters results
- [ ] "Only AI" toggle works
- [ ] Time filter dropdown works
- [ ] Clearing all filters returns to card layout
- [ ] Pull to refresh works

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(ios): integration fixes for DiscoverView"
```
