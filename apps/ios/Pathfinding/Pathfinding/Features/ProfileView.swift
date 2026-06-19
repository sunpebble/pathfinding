import SwiftUI

struct ProfileView: View {
  @EnvironmentObject private var authViewModel: AuthViewModel
  @Environment(ThemeManager.self) private var themeManager
  @Environment(\.localizationManager) private var localizationManager
  @Environment(\.colorScheme) private var colorScheme
  @State private var showAPISettings = false
  @State private var showAbout = false
  @State private var showThemeSettings = false
  @State private var showLanguageSettings = false
  @State private var showCloudSyncSettings = false
  @State private var showLogin = false
  @State private var followStore = FollowStore.shared
  @State private var followStats: FollowStats?
  @State private var favoriteStore = FavoriteStore.shared
  @State private var isVisible = false

  // Navigation destinations for stats
  @State private var navigateToFavorites = false
  @State private var navigateToLikes = false
  @State private var navigateToFollowManagement = false

  /// Whether user is logged in (not guest mode)
  private var isLoggedIn: Bool {
    authViewModel.isAuthenticated && !authViewModel.isGuestMode
  }

  var body: some View {
    NavigationStack {
      ZStack {
        // Explorer background with enhanced gradient
        ExplorerPageBackground(style: .list, accentColor: .purple)

        List {
          // MARK: - Profile Section
        Section {
          if isLoggedIn {
            // Show logged-in user info
            ProfileHeaderView(
              email: authViewModel.userEmail,
              isLoggedIn: true,
              colorScheme: colorScheme
            )
            .bounceIn(from: .top, distance: 30, delay: 0.1)
          } else {
            // Show guest prompt
            Button {
              showLogin = true
            } label: {
              ProfileHeaderView(
                email: nil,
                isLoggedIn: false,
                colorScheme: colorScheme,
                showChevron: true
              )
            }
            .buttonStyle(.plain)
          } // end else (guest)
        }

        // MARK: - Stats Section
        Section {
          VStack(spacing: DesignTokens.Spacing.md) {
            // Main stats row with staggered animation
            HStack(spacing: 0) {
              Button {
                navigateToFavorites = true
              } label: {
                EnhancedStatItem(
                  value: "\(favoriteStore.totalFavoritesCount)",
                  label: "profile.favorites".localized,
                  icon: "bookmark.fill",
                  color: .orange,
                  index: 0
                )
              }
              .buttonStyle(.plain)

              ExplorerStatDivider()

              Button {
                navigateToLikes = true
              } label: {
                EnhancedStatItem(
                  value: "\(favoriteStore.totalLikesCount)",
                  label: "profile.likes".localized,
                  icon: "heart.fill",
                  color: .red,
                  index: 1
                )
              }
              .buttonStyle(.plain)

              ExplorerStatDivider()

              EnhancedStatItem(
                value: "0",
                label: "profile.footprints".localized,
                icon: "shoeprints.fill",
                color: DesignTokens.Colors.Terrain.forest,
                index: 2
              )
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(favoriteStore.totalFavoritesCount) 个收藏，\(favoriteStore.totalLikesCount) 个喜欢，0 个足迹")

            ExplorerDivider(style: .topographic, color: .purple.opacity(0.3))
              .padding(.horizontal, DesignTokens.Spacing.md)

            // Follow stats row
            Button {
              navigateToFollowManagement = true
            } label: {
              HStack(spacing: 0) {
                EnhancedStatItem(
                  value: "\(followStats?.followersCount ?? 0)",
                  label: "profile.followers".localized,
                  icon: "person.2.fill",
                  color: .pink,
                  index: 3
                )

                ExplorerStatDivider()

                EnhancedStatItem(
                  value: "\(followStats?.followingCount ?? 0)",
                  label: "profile.following".localized,
                  icon: "person.wave.2.fill",
                  color: .purple,
                  index: 4
                )
              }
            }
            .buttonStyle(.plain)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(followStats?.followersCount ?? 0) 个关注者，\(followStats?.followingCount ?? 0) 个关注")
            .accessibilityHint("双击管理关注")
          }
          .padding(.vertical, DesignTokens.Spacing.xs)
        }
        .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))

        // MARK: - Travel Stats Section
        Section {
          NavigationLink {
            StatsView()
          } label: {
            ExplorerSettingsRow(
              icon: "chart.bar.xaxis",
              title: "profile.travel_stats".localized,
              subtitle: "profile.travel_stats_subtitle".localized,
              iconColor: .indigo,
              terrainColor: DesignTokens.Colors.Terrain.ocean
            )
          }
          .staggeredAnimation(index: 0, baseDelay: 0.03)

          NavigationLink {
            PreferencesView()
          } label: {
            ExplorerSettingsRow(
              icon: "heart.text.square",
              title: "profile.preferences".localized,
              subtitle: "profile.preferences_subtitle".localized,
              iconColor: .pink,
              terrainColor: DesignTokens.Colors.Terrain.volcano
            )
          }
          .staggeredAnimation(index: 1, baseDelay: 0.03)
        } header: {
          ExplorerSectionHeaderLabel(
            title: "profile.section.travel_data".localized,
            icon: "chart.xyaxis.line",
            color: .indigo
          )
        }

        // MARK: - Likes & Favorites Section
        Section {
          NavigationLink {
            MyFavoritesView()
          } label: {
            ExplorerSettingsRow(
              icon: "bookmark.fill",
              title: "profile.my_favorites".localized,
              subtitle: String(format: "profile.favorites_count".localized, favoriteStore.totalFavoritesCount),
              iconColor: .orange,
              terrainColor: DesignTokens.Colors.Terrain.desert
            )
          }
          .staggeredAnimation(index: 2, baseDelay: 0.03)

          NavigationLink {
            MyLikesView()
          } label: {
            ExplorerSettingsRow(
              icon: "heart.fill",
              title: "profile.my_likes".localized,
              subtitle: String(format: "profile.likes_count".localized, favoriteStore.totalLikesCount),
              iconColor: .red,
              terrainColor: DesignTokens.Colors.Terrain.volcano
            )
          }
          .staggeredAnimation(index: 3, baseDelay: 0.03)

          NavigationLink {
            FavoriteCollectionsView()
          } label: {
            ExplorerSettingsRow(
              icon: "folder.fill",
              title: "profile.collections".localized,
              subtitle: String(format: "profile.collections_count".localized, favoriteStore.collections.count),
              iconColor: .purple,
              terrainColor: DesignTokens.Colors.Terrain.mountain
            )
          }
          .staggeredAnimation(index: 4, baseDelay: 0.03)
        } header: {
          ExplorerSectionHeaderLabel(
            title: "profile.section.likes_favorites".localized,
            icon: "heart.circle.fill",
            color: .orange
          )
        }

        // MARK: - Travel Services Section
        Section {
          NavigationLink {
            InsuranceListView()
          } label: {
            ExplorerSettingsRow(
              icon: "shield.checkered",
              title: "profile.insurance".localized,
              subtitle: "profile.insurance_subtitle".localized,
              iconColor: .indigo,
              terrainColor: DesignTokens.Colors.Terrain.glacier
            )
          }
          .staggeredAnimation(index: 5, baseDelay: 0.03)
        } header: {
          ExplorerSectionHeaderLabel(
            title: "profile.section.travel_services".localized,
            icon: "airplane.circle.fill",
            color: .indigo
          )
        }

        // MARK: - Appearance Section
        Section {
          Button {
            showThemeSettings = true
          } label: {
            ExplorerSettingsRow(
              icon: themeManager.currentMode.icon,
              title: "profile.theme".localized,
              subtitle: themeManager.currentMode.displayName,
              iconColor: themeManager.currentMode.iconColor,
              terrainColor: DesignTokens.Colors.Terrain.mountain,
              showChevron: true
            )
          }
          .staggeredAnimation(index: 6, baseDelay: 0.03)

          Button {
            showLanguageSettings = true
          } label: {
            ExplorerSettingsRow(
              icon: localizationManager.currentLanguage.icon,
              title: "profile.language".localized,
              subtitle: localizationManager.currentLanguage.nativeName,
              iconColor: localizationManager.currentLanguage.iconColor,
              terrainColor: DesignTokens.Colors.Terrain.ocean,
              showChevron: true
            )
          }
          .staggeredAnimation(index: 7, baseDelay: 0.03)
        } header: {
          ExplorerSectionHeaderLabel(
            title: "profile.section.appearance".localized,
            icon: "paintpalette.fill",
            color: .purple
          )
        }

        // MARK: - Settings Section
        Section {
          Button {
            showCloudSyncSettings = true
          } label: {
            iCloudSyncSettingsRow(showChevron: true)
          }
          .staggeredAnimation(index: 8, baseDelay: 0.03)

          NavigationLink {
            OfflineMapListView()
          } label: {
            OfflineMapSettingsRow()
          }
          .staggeredAnimation(index: 9, baseDelay: 0.03)

          NavigationLink {
            SiriShortcutsSettingsView()
          } label: {
            ExplorerSettingsRow(
              icon: "waveform",
              title: "profile.siri_shortcuts".localized,
              subtitle: "profile.siri_shortcuts_subtitle".localized,
              iconColor: .purple,
              terrainColor: DesignTokens.Colors.Terrain.mountain
            )
          }
          .staggeredAnimation(index: 10, baseDelay: 0.03)

          Button {
            showAPISettings = true
          } label: {
            ExplorerSettingsRow(
              icon: "server.rack",
              title: "profile.api_config".localized,
              subtitle: AppConfig.apiBaseURL,
              iconColor: .blue,
              terrainColor: DesignTokens.Colors.Terrain.ocean,
              showChevron: true
            )
          }
          .staggeredAnimation(index: 11, baseDelay: 0.03)

          NavigationLink {
            CacheSettingsView()
          } label: {
            ExplorerSettingsRow(
              icon: "internaldrive",
              title: "profile.cache".localized,
              subtitle: "profile.cache_subtitle".localized,
              iconColor: .orange,
              terrainColor: DesignTokens.Colors.Terrain.desert
            )
          }
          .staggeredAnimation(index: 12, baseDelay: 0.03)

          Button {
            showAbout = true
          } label: {
            ExplorerSettingsRow(
              icon: "info.circle",
              title: "profile.about".localized,
              subtitle: "profile.about_subtitle".localized,
              iconColor: .purple,
              terrainColor: DesignTokens.Colors.Terrain.mountain,
              showChevron: true
            )
          }
          .staggeredAnimation(index: 13, baseDelay: 0.03)
        } header: {
          ExplorerSectionHeaderLabel(
            title: "profile.section.settings".localized,
            icon: "gearshape.fill",
            color: .gray
          )
        }

        // MARK: - Version Section
        Section {
          ExplorerVersionRow(
            label: "profile.version".localized,
            value: "\(AppConfig.appVersion) (\(AppConfig.buildNumber))"
          )

          #if DEBUG
            ExplorerVersionRow(
              label: "profile.environment".localized,
              value: AppConfig.Environment.current.rawValue.capitalized,
              valueColor: .orange
            )
          #endif
        }
      }
      .scrollContentBackground(.hidden)
      .listStyle(.insetGrouped)
      .navigationTitle("profile.title".localized)
      .sheet(isPresented: $showAPISettings) {
        APISettingsSheet()
      }
      .sheet(isPresented: $showAbout) {
        AboutSheet()
      }
      .sheet(isPresented: $showThemeSettings) {
        ThemeSettingsSheet()
      }
      .sheet(isPresented: $showLanguageSettings) {
        LanguageSettingsSheet()
      }
      .sheet(isPresented: $showCloudSyncSettings) {
        iCloudSyncSettingsSheet()
      }
      .sheet(isPresented: $showLogin) {
        LoginView()
      }
      .navigationDestination(isPresented: $navigateToFavorites) {
        MyFavoritesView()
      }
      .navigationDestination(isPresented: $navigateToLikes) {
        MyLikesView()
      }
      .navigationDestination(isPresented: $navigateToFollowManagement) {
        FollowManagementView()
      }
      .task {
        await loadFollowStats()
        await loadFavoriteStats()
      }
      } // end ZStack
    }
  }

  private func loadFollowStats() async {
    // In a real app, get current user ID from auth
    // For now, use a placeholder or skip if not logged in
    if let userId = AuthManager.shared.currentUserId {
      followStats = await followStore.getFollowStats(for: userId)
    }
  }

  private func loadFavoriteStats() async {
    // Load collections, favorites, and likes count in parallel
    await withTaskGroup(of: Void.self) { group in
      group.addTask {
        await self.favoriteStore.fetchCollections()
      }
      group.addTask {
        // Fetch first page to get total favorites count from API response
        await self.favoriteStore.fetchFavoritedItineraries(refresh: true)
      }
      group.addTask {
        // Fetch first page to get total likes count from API response
        await self.favoriteStore.fetchLikedItineraries(refresh: true)
      }
    }
  }
}

#Preview {
  ProfileView()
    .environment(ThemeManager.shared)
}
