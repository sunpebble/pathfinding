import SwiftUI

struct ProfileView: View {
  @EnvironmentObject private var authViewModel: AuthViewModel
  @Environment(ThemeManager.self) private var themeManager
  @Environment(\.localizationManager) private var localizationManager
  @State private var showLogin = false
  @State private var followStore = FollowStore.shared
  @State private var followStats: FollowStats?
  @State private var favoriteStore = FavoriteStore.shared

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
      List {
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
        } header: {
          Text("profile.section.travel_data".localized)
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
        } header: {
          Text("profile.section.likes_favorites".localized)
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
        } header: {
          Text("profile.section.travel_services".localized)
        }

        // MARK: - Appearance Section
        Section {
          NavigationLink {
            ThemeSettingsSheet()
          } label: {
            ExplorerSettingsRow(
              icon: themeManager.currentMode.icon,
              title: "profile.theme".localized,
              subtitle: themeManager.currentMode.displayName,
              iconColor: themeManager.currentMode.iconColor,
              terrainColor: DesignTokens.Colors.Terrain.mountain
            )
          }

          NavigationLink {
            LanguageSettingsSheet()
          } label: {
            ExplorerSettingsRow(
              icon: localizationManager.currentLanguage.icon,
              title: "profile.language".localized,
              subtitle: localizationManager.currentLanguage.nativeName,
              iconColor: localizationManager.currentLanguage.iconColor,
              terrainColor: DesignTokens.Colors.Terrain.ocean
            )
          }
        } header: {
          Text("profile.section.appearance".localized)
        }

        // MARK: - Settings Section
        Section {
          NavigationLink {
            iCloudSyncSettingsSheet()
          } label: {
            iCloudSyncSettingsRow()
          }

          NavigationLink {
            OfflineMapListView()
          } label: {
            OfflineMapSettingsRow()
          }

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

          NavigationLink {
            APISettingsSheet()
          } label: {
            ExplorerSettingsRow(
              icon: "server.rack",
              title: "profile.api_config".localized,
              subtitle: AppConfig.apiBaseURL,
              iconColor: .blue,
              terrainColor: DesignTokens.Colors.Terrain.ocean
            )
          }

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

          NavigationLink {
            AboutSheet()
          } label: {
            ExplorerSettingsRow(
              icon: "info.circle",
              title: "profile.about".localized,
              subtitle: "profile.about_subtitle".localized,
              iconColor: .purple,
              terrainColor: DesignTokens.Colors.Terrain.mountain
            )
          }
        } header: {
          Text("profile.section.settings".localized)
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
      .listStyle(.insetGrouped)
      .navigationTitle("profile.title".localized)
      .safeAreaInset(edge: .top) {
        heroView
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
    }
  }

  // MARK: - Glass Hero

  private var heroView: some View {
    GlassEffectContainer {
      VStack(spacing: DesignTokens.Spacing.md) {
        // Avatar + name row
        HStack(spacing: DesignTokens.Spacing.lg) {
          Image(systemName: "person.fill")
            .font(.system(size: 32, weight: .medium))
            .foregroundStyle(.white)
            .padding(DesignTokens.Spacing.lg)
            .glassEffect(.regular.tint(.purple.opacity(0.25)), in: Circle())

          VStack(alignment: .leading, spacing: 6) {
            Text(isLoggedIn ? (authViewModel.userEmail ?? "User") : "profile.guest".localized)
              .font(.title2)
              .fontWeight(.bold)
              .foregroundStyle(.primary)
            if isLoggedIn {
              Text("profile.logged_in".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            } else {
              HStack(spacing: 4) {
                Image(systemName: "arrow.right.circle.fill")
                  .font(.caption)
                  .foregroundStyle(.indigo)
                Text("profile.login_prompt".localized)
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
              }
            }
          }
          Spacer()
          if !isLoggedIn {
            Button("profile.login_prompt".localized) {
              showLogin = true
            }
            .buttonStyle(.glass)
          }
        }

        Divider()

        // Stats row inline
        HStack(spacing: 0) {
          Button { navigateToFavorites = true } label: {
            EnhancedStatItem(
              value: "\(favoriteStore.totalFavoritesCount)",
              label: "profile.favorites".localized,
              icon: "bookmark.fill",
              color: .orange,
              index: 0
            )
          }
          .buttonStyle(.plain)

          Divider().frame(height: 50)

          Button { navigateToLikes = true } label: {
            EnhancedStatItem(
              value: "\(favoriteStore.totalLikesCount)",
              label: "profile.likes".localized,
              icon: "heart.fill",
              color: .red,
              index: 1
            )
          }
          .buttonStyle(.plain)

          Divider().frame(height: 50)

          EnhancedStatItem(
            value: "0",
            label: "profile.footprints".localized,
            icon: "shoeprints.fill",
            color: DesignTokens.Colors.Terrain.forest,
            index: 2
          )

          Divider().frame(height: 50)

          Button { navigateToFollowManagement = true } label: {
            HStack(spacing: 0) {
              EnhancedStatItem(
                value: "\(followStats?.followersCount ?? 0)",
                label: "profile.followers".localized,
                icon: "person.2.fill",
                color: .pink,
                index: 3
              )
              Divider().frame(height: 50)
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
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
          "\(favoriteStore.totalFavoritesCount) 个收藏，\(favoriteStore.totalLikesCount) 个喜欢，0 个足迹，\(followStats?.followersCount ?? 0) 个关注者，\(followStats?.followingCount ?? 0) 个关注"
        )
      }
      .padding(DesignTokens.Spacing.md)
    }
    .backgroundExtensionEffect()
    .padding(.horizontal, DesignTokens.Spacing.md)
    .padding(.top, DesignTokens.Spacing.sm)
  }

  // MARK: - Data Loading

  private func loadFollowStats() async {
    if let userId = AuthManager.shared.currentUserId {
      followStats = await followStore.getFollowStats(for: userId)
    }
  }

  private func loadFavoriteStats() async {
    await withTaskGroup(of: Void.self) { group in
      group.addTask {
        await self.favoriteStore.fetchCollections()
      }
      group.addTask {
        await self.favoriteStore.fetchFavoritedItineraries(refresh: true)
      }
      group.addTask {
        await self.favoriteStore.fetchLikedItineraries(refresh: true)
      }
    }
  }
}

#Preview {
  ProfileView()
    .environment(ThemeManager.shared)
}
