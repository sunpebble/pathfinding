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

// MARK: - Profile Header View

struct ProfileHeaderView: View {
  let email: String?
  let isLoggedIn: Bool
  let colorScheme: ColorScheme
  var showChevron: Bool = false

  @State private var isGlowing = false
  @State private var pulseScale: CGFloat = 1.0

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.lg) {
      // Avatar with enhanced styling and dark mode glow
      ZStack {
        // Outer animated glow (dark mode only)
        if colorScheme == .dark {
          Circle()
            .fill(
              RadialGradient(
                colors: [.purple.opacity(0.4), .indigo.opacity(0.2), .clear],
                center: .center,
                startRadius: 30,
                endRadius: isGlowing ? 55 : 45
              )
            )
            .frame(width: 90, height: 90)
            .blur(radius: 8)
        }

        // Gradient blur background
        Circle()
          .fill(
            LinearGradient(
              colors: [.indigo.opacity(0.3), .purple.opacity(0.3)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 80, height: 80)
          .blur(radius: 8)

        // Main avatar circle with pulse animation
        Circle()
          .fill(
            LinearGradient(
              colors: [.indigo, .purple],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 72, height: 72)
          .scaleEffect(pulseScale)
          .shadow(
            color: colorScheme == .dark ? .purple.opacity(0.5) : .indigo.opacity(0.4),
            radius: colorScheme == .dark ? 12 : 8,
            y: 4
          )

        Image(systemName: "person.fill")
          .font(.system(size: 32, weight: .medium))
          .foregroundStyle(.white)
      }
      .frame(width: 80, height: 80)
      .onAppear {
        if colorScheme == .dark {
          withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
            isGlowing = true
          }
        }
        withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
          pulseScale = 1.03
        }
      }

      VStack(alignment: .leading, spacing: 6) {
        Text(isLoggedIn ? (email ?? "User") : "profile.guest".localized)
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

      if showChevron {
        Image(systemName: "chevron.right")
          .font(.body)
          .fontWeight(.semibold)
          .foregroundStyle(.quaternary)
      }
    }
    .padding(.vertical, DesignTokens.Spacing.sm)
  }
}

// MARK: - Enhanced Stat Item

struct EnhancedStatItem: View {
  let value: String
  let label: String
  let icon: String
  let color: Color
  var index: Int = 0

  @Environment(\.colorScheme) private var colorScheme
  @State private var isGlowing = false

  var body: some View {
    VStack(spacing: 8) {
      ZStack {
        // Subtle gradient background
        Circle()
          .fill(
            LinearGradient(
              colors: [color.opacity(0.15), color.opacity(0.08)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 48, height: 48)

        // Glow effect in dark mode
        if colorScheme == .dark {
          Circle()
            .fill(color.opacity(isGlowing ? 0.3 : 0.15))
            .frame(width: 48, height: 48)
            .blur(radius: 4)
        }

        Image(systemName: icon)
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(color)
      }
      .shadow(
        color: colorScheme == .dark ? color.opacity(0.3) : .clear,
        radius: 6,
        y: 0
      )

      Text(value)
        .font(.title3)
        .fontWeight(.bold)
        .monospacedDigit()

      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.sm)
    .staggeredAnimation(index: index, baseDelay: 0.04)
    .onAppear {
      if colorScheme == .dark {
        withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
          isGlowing = true
        }
      }
    }
  }
}

// MARK: - Explorer Stat Divider

struct ExplorerStatDivider: View {
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    Rectangle()
      .fill(
        LinearGradient(
          colors: [
            .clear,
            colorScheme == .dark ? Color.white.opacity(0.15) : Color.black.opacity(0.1),
            .clear
          ],
          startPoint: .top,
          endPoint: .bottom
        )
      )
      .frame(width: 1, height: 50)
  }
}

// MARK: - Explorer Section Header Label

struct ExplorerSectionHeaderLabel: View {
  let title: String
  let icon: String
  let color: Color

  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.xs) {
      Image(systemName: icon)
        .font(.system(size: 12, weight: .semibold))
        .foregroundStyle(color)

      Text(title)
        .font(.caption)
        .fontWeight(.semibold)
        .foregroundStyle(color)
    }
    .textCase(nil)
  }
}

// MARK: - Explorer Settings Row

struct ExplorerSettingsRow: View {
  let icon: String
  let title: String
  let subtitle: String
  let iconColor: Color
  var terrainColor: Color = .clear
  var showChevron: Bool = false

  @Environment(\.colorScheme) private var colorScheme
  @State private var isPressed = false

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Icon with gradient background
      ZStack {
        RoundedRectangle(cornerRadius: 8)
          .fill(
            LinearGradient(
              colors: [
                iconColor.opacity(colorScheme == .dark ? 0.25 : 0.15),
                iconColor.opacity(colorScheme == .dark ? 0.15 : 0.08)
              ],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 34, height: 34)

        // Subtle terrain color accent
        if terrainColor != .clear {
          RoundedRectangle(cornerRadius: 8)
            .stroke(terrainColor.opacity(0.2), lineWidth: 0.5)
            .frame(width: 34, height: 34)
        }

        Image(systemName: icon)
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(iconColor)
      }
      .shadow(
        color: colorScheme == .dark ? iconColor.opacity(0.2) : .clear,
        radius: 4,
        y: 0
      )

      VStack(alignment: .leading, spacing: 3) {
        Text(title)
          .font(.body)
          .foregroundStyle(.primary)

        Text(subtitle)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }

      if showChevron {
        Spacer()

        Image(systemName: "chevron.right")
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(.tertiary)
      }
    }
    .padding(.vertical, 3)
    .scaleEffect(isPressed ? 0.98 : 1)
    .animation(.spring(response: 0.2), value: isPressed)
  }
}

// MARK: - Explorer Version Row

struct ExplorerVersionRow: View {
  let label: String
  let value: String
  var valueColor: Color = .secondary

  var body: some View {
    HStack {
      Text(label)
        .foregroundStyle(.primary)
      Spacer()
      Text(value)
        .foregroundStyle(valueColor)
        .font(.subheadline)
        .fontDesign(.monospaced)
    }
    .padding(.vertical, 2)
  }
}

// MARK: - Enhanced Stat Divider (Legacy - keeping for compatibility)

struct EnhancedStatDivider: View {
  var body: some View {
    Rectangle()
      .fill(.quaternary)
      .frame(width: 1, height: 50)
  }
}

// MARK: - Stat Item (Legacy)

struct StatItem: View {
  let value: String
  let label: String
  let icon: String
  let color: Color

  var body: some View {
    VStack(spacing: 4) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(color)

      Text(value)
        .font(.title2)
        .fontWeight(.bold)

      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.sm)
  }
}

// MARK: - Follow Stat Item (Legacy)

struct FollowStatItem: View {
  let value: String
  let label: String
  let icon: String
  let color: Color

  var body: some View {
    VStack(spacing: 4) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(color)

      Text(value)
        .font(.title2)
        .fontWeight(.bold)

      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.sm)
  }
}

// MARK: - Settings Row

struct SettingsRow: View {
  let icon: String
  let title: String
  let subtitle: String
  let iconColor: Color
  var showChevron: Bool = false

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Icon with rounded background
      ZStack {
        RoundedRectangle(cornerRadius: 8)
          .fill(iconColor.opacity(0.12))
          .frame(width: 32, height: 32)

        Image(systemName: icon)
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(iconColor)
      }

      VStack(alignment: .leading, spacing: 3) {
        Text(title)
          .font(.body)
          .foregroundStyle(.primary)

        Text(subtitle)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }

      if showChevron {
        Spacer()

        Image(systemName: "chevron.right")
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(.tertiary)
      }
    }
    .padding(.vertical, 2)
  }
}

// MARK: - API Settings Sheet

struct APISettingsSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var apiURL = AppConfig.apiBaseURL

  var body: some View {
    NavigationStack {
      Form {
        Section("api.server".localized) {
          TextField("api.url_placeholder".localized, text: $apiURL)
            .textInputAutocapitalization(.never)
            .keyboardType(.URL)
        }

        Section {
          Text(String(format: "api.current_environment".localized, AppConfig.Environment.current.rawValue.capitalized))
            .foregroundStyle(.secondary)
        } footer: {
          Text("api.restart_hint".localized)
        }
      }
      .navigationTitle("api.title".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("common.cancel".localized) { dismiss() }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button("common.save".localized) {
            // Save to UserDefaults
            dismiss()
          }
          .fontWeight(.semibold)
        }
      }
    }
  }
}

// MARK: - Cache Settings View

struct CacheSettingsView: View {
  @State private var isClearing = false

  var body: some View {
    List {
      Section("cache.image".localized) {
        HStack {
          Text("cache.image_size_limit".localized)
          Spacer()
          Text("\(AppConfig.imageCacheSizeLimit / 1024 / 1024) MB")
            .foregroundStyle(.secondary)
        }

        Button {
          Task {
            isClearing = true
            ImageCache.shared.clearCache()
            try? await Task.sleep(for: .seconds(0.5))
            isClearing = false
          }
        } label: {
          HStack {
            Text("cache.clear_image".localized)
            Spacer()
            if isClearing {
              ProgressView()
            }
          }
        }
        .disabled(isClearing)
      }

      Section("cache.api".localized) {
        HStack {
          Text("cache.api_validity".localized)
          Spacer()
          Text(String(format: "cache.api_validity_minutes".localized, Int(AppConfig.apiCacheValiditySeconds / 60)))
            .foregroundStyle(.secondary)
        }

        Button {
          Task {
            await APIClient.shared.clearCache()
            GuideStore.shared.clearCache()
          }
        } label: {
          Text("cache.clear_api".localized)
        }
      }
    }
    .navigationTitle("cache.title".localized)
  }
}

// MARK: - About Sheet

struct AboutSheet: View {
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: DesignTokens.Spacing.xl) {
          // App Icon
          ZStack {
            RoundedRectangle(cornerRadius: 24)
              .fill(
                LinearGradient(
                  colors: [.indigo, .purple],
                  startPoint: .topLeading,
                  endPoint: .bottomTrailing
                )
              )
              .frame(width: 100, height: 100)

            Image(systemName: "map.fill")
              .font(.system(size: 44))
              .foregroundStyle(.white)
          }
          .shadow(color: .indigo.opacity(0.3), radius: 20, y: 10)

          VStack(spacing: 4) {
            Text("about.app_name".localized)
              .font(.title)
              .fontWeight(.bold)

            Text(String(format: "about.version".localized, AppConfig.appVersion))
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }

          Text("about.tagline".localized)
            .font(.body)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
            .padding(.horizontal)

          Divider()
            .padding(.horizontal)

          VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            AboutRow(title: "about.developer".localized, value: "about.developer_name".localized)
            AboutRow(title: "about.build_number".localized, value: AppConfig.buildNumber)
            AboutRow(title: "about.swift_version".localized, value: "6.0")
            AboutRow(title: "about.min_ios".localized, value: "iOS 17.0")
          }
          .padding(.horizontal)

          Spacer()
        }
        .padding(.top, DesignTokens.Spacing.xl)
      }
      .navigationTitle("about.title".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("common.done".localized) { dismiss() }
        }
      }
    }
  }
}

struct AboutRow: View {
  let title: String
  let value: String

  var body: some View {
    HStack {
      Text(title)
        .foregroundStyle(.secondary)
      Spacer()
      Text(value)
    }
  }
}

// MARK: - Offline Map Settings Row

struct OfflineMapSettingsRow: View {
  @State private var manager = OfflineMapManager.shared
  @Environment(\.colorScheme) private var colorScheme

  private let mapColor = DesignTokens.Colors.Terrain.forest

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Icon with gradient background
      ZStack {
        RoundedRectangle(cornerRadius: 8)
          .fill(
            LinearGradient(
              colors: [
                mapColor.opacity(colorScheme == .dark ? 0.25 : 0.15),
                mapColor.opacity(colorScheme == .dark ? 0.15 : 0.08)
              ],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 34, height: 34)

        Image(systemName: "map.fill")
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(mapColor)
      }
      .shadow(
        color: colorScheme == .dark ? mapColor.opacity(0.2) : .clear,
        radius: 4,
        y: 0
      )

      VStack(alignment: .leading, spacing: 3) {
        Text("profile.offline_maps".localized)
          .font(.body)
          .foregroundStyle(.primary)

        Text(subtitleText)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }

      Spacer()

      // Show download count badge if any
      if !manager.downloadedRegions.isEmpty {
        Text("\(manager.downloadedRegions.count)")
          .font(.caption2)
          .fontWeight(.semibold)
          .foregroundStyle(.white)
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(
            LinearGradient(
              colors: [mapColor, mapColor.opacity(0.8)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            ),
            in: Capsule()
          )
      }
    }
    .padding(.vertical, 3)
  }

  private var subtitleText: String {
    if manager.downloadedRegions.isEmpty {
      return "profile.offline_maps_subtitle".localized
    } else {
      return String(format: "profile.offline_maps_downloaded".localized, manager.formattedTotalStorageUsed)
    }
  }
}

// MARK: - iCloud Sync Settings Row

struct iCloudSyncSettingsRow: View {
  @State private var syncManager = CloudKitSyncManager.shared
  @Environment(\.colorScheme) private var colorScheme
  var showChevron: Bool = false

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Icon with gradient background and breathing animation
      ZStack {
        RoundedRectangle(cornerRadius: 8)
          .fill(
            LinearGradient(
              colors: [
                syncStatusColor.opacity(colorScheme == .dark ? 0.25 : 0.15),
                syncStatusColor.opacity(colorScheme == .dark ? 0.15 : 0.08)
              ],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 34, height: 34)

        Image(systemName: syncStatusIcon)
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(syncStatusColor)
          .symbolEffect(.pulse, isActive: syncManager.syncStatus == .syncing)
      }
      .shadow(
        color: colorScheme == .dark ? syncStatusColor.opacity(0.3) : .clear,
        radius: 4,
        y: 0
      )
      .breathingAnimation(
        minOpacity: 0.8,
        maxOpacity: 1.0,
        duration: 2.0
      )

      VStack(alignment: .leading, spacing: 3) {
        Text("profile.icloud_sync".localized)
          .font(.body)
          .foregroundStyle(.primary)

        Text(syncStatusText)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }

      Spacer()

      if syncManager.pendingConflicts.count > 0 {
        Text("\(syncManager.pendingConflicts.count)")
          .font(.caption2)
          .fontWeight(.semibold)
          .foregroundStyle(.white)
          .padding(.horizontal, 6)
          .padding(.vertical, 2)
          .background(.orange, in: Capsule())
          .pulseAnimation(duration: 1.5)
      }

      if showChevron {
        Image(systemName: "chevron.right")
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(.tertiary)
      }
    }
    .padding(.vertical, 3)
  }

  private var syncStatusIcon: String {
    if !syncManager.isSyncEnabled {
      return "icloud.slash"
    }
    return syncManager.syncStatus.icon
  }

  private var syncStatusColor: Color {
    if !syncManager.isSyncEnabled {
      return .secondary
    }
    switch syncManager.syncStatus {
    case .idle:
      return .cyan
    case .syncing:
      return .blue
    case .success:
      return DesignTokens.Colors.Terrain.forest
    case .error:
      return .red
    }
  }

  private var syncStatusText: String {
    if !syncManager.isSyncEnabled {
      return "icloud.sync.disabled".localized
    }
    return syncManager.syncStatus.displayText
  }
}

// MARK: - iCloud Sync Settings Sheet

struct iCloudSyncSettingsSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var syncManager = CloudKitSyncManager.shared
  @State private var showConflictResolver = false
  @State private var selectedConflict: SyncConflict?

  var body: some View {
    NavigationStack {
      List {
        // MARK: - Account & Status
        Section {
          iCloudStatusCard(syncManager: syncManager)
        }

        // MARK: - Sync Toggle
        Section {
          Toggle(isOn: Binding(
            get: { syncManager.isSyncEnabled },
            set: { syncManager.isSyncEnabled = $0 }
          )) {
            HStack {
              Image(systemName: "icloud.fill")
                .foregroundStyle(.cyan)
              VStack(alignment: .leading, spacing: 2) {
                Text("icloud.enable_sync".localized)
                Text("icloud.enable_sync_description".localized)
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
          }
          .disabled(!syncManager.isICloudAvailable)

          if syncManager.isSyncEnabled {
            Toggle(isOn: Binding(
              get: { syncManager.isAutoSyncEnabled },
              set: { syncManager.isAutoSyncEnabled = $0 }
            )) {
              HStack {
                Image(systemName: "arrow.triangle.2.circlepath")
                  .foregroundStyle(.blue)
                VStack(alignment: .leading, spacing: 2) {
                  Text("icloud.auto_sync".localized)
                  Text("icloud.auto_sync_description".localized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
              }
            }
          }
        } header: {
          Text("icloud.sync_options".localized)
        }

        // MARK: - Manual Sync
        if syncManager.isSyncEnabled {
          Section {
            Button {
              Task {
                await syncManager.startSync()
              }
            } label: {
              HStack {
                Image(systemName: "arrow.triangle.2.circlepath")
                  .foregroundStyle(.blue)
                Text("icloud.sync_now".localized)
                Spacer()
                if syncManager.syncStatus == .syncing {
                  ProgressView()
                    .controlSize(.small)
                }
              }
            }
            .disabled(syncManager.syncStatus == .syncing)
          } header: {
            Text("icloud.actions".localized)
          } footer: {
            if let lastSync = syncManager.lastSyncTime {
              Text(String(format: "icloud.last_sync".localized, lastSync.formatted(date: .abbreviated, time: .shortened)))
            }
          }
        }

        // MARK: - Conflicts
        if !syncManager.pendingConflicts.isEmpty {
          Section {
            ForEach(syncManager.pendingConflicts) { conflict in
              Button {
                selectedConflict = conflict
                showConflictResolver = true
              } label: {
                HStack {
                  Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                  VStack(alignment: .leading, spacing: 2) {
                    Text(conflict.localItinerary.title)
                      .foregroundStyle(.primary)
                    Text(conflict.conflictDescription)
                      .font(.caption)
                      .foregroundStyle(.secondary)
                  }
                  Spacer()
                  Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
              }
            }
          } header: {
            HStack {
              Text("icloud.conflicts".localized)
              Spacer()
              Text("\(syncManager.pendingConflicts.count)")
                .font(.caption)
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(.orange, in: Capsule())
            }
          } footer: {
            Text("icloud.conflicts_description".localized)
          }
        }

        // MARK: - Info
        Section {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Label("icloud.about".localized, systemImage: "info.circle")
              .font(.subheadline)
              .fontWeight(.medium)

            Text("icloud.about_description".localized)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          .padding(.vertical, DesignTokens.Spacing.xs)
        }
      }
      .navigationTitle("icloud.title".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("common.done".localized) { dismiss() }
        }
      }
      .sheet(isPresented: $showConflictResolver) {
        if let conflict = selectedConflict {
          ConflictResolverSheet(conflict: conflict, syncManager: syncManager)
        }
      }
    }
    .presentationDetents([.medium, .large])
    .presentationDragIndicator(.visible)
  }
}

// MARK: - iCloud Status Card

private struct iCloudStatusCard: View {
  let syncManager: CloudKitSyncManager

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      ZStack {
        Circle()
          .fill(statusBackgroundColor.opacity(0.15))
          .frame(width: 56, height: 56)

        Image(systemName: statusIcon)
          .font(.title)
          .foregroundStyle(statusBackgroundColor)
          .symbolEffect(.pulse, isActive: syncManager.syncStatus == .syncing)
      }

      VStack(alignment: .leading, spacing: 4) {
        Text(accountStatusText)
          .font(.headline)

        Text(syncManager.syncStatus.displayText)
          .font(.subheadline)
          .foregroundStyle(.secondary)

        if !syncManager.isICloudAvailable {
          Text("icloud.sign_in_required".localized)
            .font(.caption)
            .foregroundStyle(.orange)
        }
      }

      Spacer()
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  private var statusIcon: String {
    if !syncManager.isICloudAvailable {
      return "icloud.slash"
    }
    return syncManager.syncStatus.icon
  }

  private var statusBackgroundColor: Color {
    if !syncManager.isICloudAvailable {
      return .secondary
    }
    switch syncManager.syncStatus {
    case .idle:
      return .cyan
    case .syncing:
      return .blue
    case .success:
      return .green
    case .error:
      return .red
    }
  }

  private var accountStatusText: String {
    switch syncManager.accountStatus {
    case .available:
      return "icloud.account_available".localized
    case .noAccount:
      return "icloud.no_account".localized
    case .restricted:
      return "icloud.account_restricted".localized
    case .couldNotDetermine:
      return "icloud.account_checking".localized
    case .temporarilyUnavailable:
      return "icloud.account_unavailable".localized
    @unknown default:
      return "icloud.account_unknown".localized
    }
  }
}

// MARK: - Conflict Resolver Sheet

private struct ConflictResolverSheet: View {
  @Environment(\.dismiss) private var dismiss
  let conflict: SyncConflict
  let syncManager: CloudKitSyncManager

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: DesignTokens.Spacing.lg) {
          // Conflict Header
          VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
              .font(.system(size: 48))
              .foregroundStyle(.orange)

            Text("icloud.conflict_detected".localized)
              .font(.title2)
              .fontWeight(.bold)

            Text("icloud.conflict_explanation".localized)
              .font(.subheadline)
              .foregroundStyle(.secondary)
              .multilineTextAlignment(.center)
              .padding(.horizontal)
          }
          .padding(.top, DesignTokens.Spacing.lg)

          // Version Comparison
          VStack(spacing: DesignTokens.Spacing.md) {
            VersionCard(
              title: "icloud.local_version".localized,
              itinerary: conflict.localItinerary,
              modifiedAt: conflict.localModifiedAt,
              icon: "iphone",
              color: .blue
            )

            Text("icloud.vs".localized)
              .font(.caption)
              .foregroundStyle(.secondary)
              .padding(.vertical, DesignTokens.Spacing.xs)

            VersionCard(
              title: "icloud.cloud_version".localized,
              itinerary: conflict.remoteItinerary,
              modifiedAt: conflict.remoteModifiedAt,
              icon: "icloud.fill",
              color: .cyan
            )
          }
          .padding(.horizontal)

          // Resolution Options
          VStack(spacing: DesignTokens.Spacing.sm) {
            Text("icloud.choose_resolution".localized)
              .font(.headline)

            ResolutionButton(
              title: "icloud.keep_local".localized,
              subtitle: "icloud.keep_local_description".localized,
              icon: "iphone",
              color: .blue
            ) {
              Task {
                await syncManager.resolveConflict(conflict, resolution: .useLocal)
                dismiss()
              }
            }

            ResolutionButton(
              title: "icloud.keep_cloud".localized,
              subtitle: "icloud.keep_cloud_description".localized,
              icon: "icloud.fill",
              color: .cyan
            ) {
              Task {
                await syncManager.resolveConflict(conflict, resolution: .useRemote)
                dismiss()
              }
            }

            ResolutionButton(
              title: "icloud.keep_both".localized,
              subtitle: "icloud.keep_both_description".localized,
              icon: "doc.on.doc.fill",
              color: .green
            ) {
              Task {
                await syncManager.resolveConflict(conflict, resolution: .keepBoth)
                dismiss()
              }
            }
          }
          .padding(.horizontal)
          .padding(.bottom, DesignTokens.Spacing.lg)
        }
      }
      .navigationTitle("icloud.resolve_conflict".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("common.cancel".localized) { dismiss() }
        }
      }
    }
  }
}

// MARK: - Version Card

private struct VersionCard: View {
  let title: String
  let itinerary: SavedItinerary
  let modifiedAt: Date
  let icon: String
  let color: Color

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: icon)
          .foregroundStyle(color)
        Text(title)
          .font(.subheadline)
          .fontWeight(.semibold)
        Spacer()
      }

      VStack(alignment: .leading, spacing: 4) {
        Text(itinerary.title)
          .font(.headline)
          .lineLimit(2)

        HStack {
          Label("\(itinerary.days.count) 天", systemImage: "calendar")
          Spacer()
          Text(modifiedAt.formatted(date: .abbreviated, time: .shortened))
        }
        .font(.caption)
        .foregroundStyle(.secondary)
      }
    }
    .padding()
    .background(color.opacity(0.1), in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    .overlay(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .stroke(color.opacity(0.3), lineWidth: 1)
    )
  }
}

// MARK: - Resolution Button

private struct ResolutionButton: View {
  let title: String
  let subtitle: String
  let icon: String
  let color: Color
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: DesignTokens.Spacing.md) {
        Image(systemName: icon)
          .font(.title2)
          .foregroundStyle(color)
          .frame(width: 32)

        VStack(alignment: .leading, spacing: 2) {
          Text(title)
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(.primary)
          Text(subtitle)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        Image(systemName: "chevron.right")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      .padding()
      .background(.quaternary, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Theme Settings Sheet

struct ThemeSettingsSheet: View {
  @Environment(\.dismiss) private var dismiss
  @Environment(ThemeManager.self) private var themeManager
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    NavigationStack {
      List {
        // MARK: - Theme Preview
        Section {
          ThemePreviewCard(colorScheme: colorScheme)
            .listRowInsets(EdgeInsets())
            .listRowBackground(Color.clear)
        }

        // MARK: - Theme Options
        Section("theme.select".localized) {
          ForEach(ThemeMode.allCases) { mode in
            ThemeModeRow(
              mode: mode,
              isSelected: themeManager.currentMode == mode
            ) {
              themeManager.setTheme(mode)
            }
          }
        }

        // MARK: - Description
        Section {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Label("theme.about".localized, systemImage: "info.circle")
              .font(.subheadline)
              .fontWeight(.medium)

            Text("theme.about_description".localized)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          .padding(.vertical, DesignTokens.Spacing.xs)
        }
      }
      .navigationTitle("theme.title".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("common.done".localized) { dismiss() }
        }
      }
    }
    .presentationDetents([.medium, .large])
    .presentationDragIndicator(.visible)
  }
}

// MARK: - Theme Preview Card

struct ThemePreviewCard: View {
  let colorScheme: ColorScheme

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Light mode preview
      ThemeMiniPreview(
        title: "theme.preview.light".localized,
        isDark: false,
        isActive: colorScheme == .light
      )

      // Dark mode preview
      ThemeMiniPreview(
        title: "theme.preview.dark".localized,
        isDark: true,
        isActive: colorScheme == .dark
      )
    }
    .padding(DesignTokens.Spacing.md)
  }
}

// MARK: - Theme Mini Preview

struct ThemeMiniPreview: View {
  let title: String
  let isDark: Bool
  let isActive: Bool

  private var backgroundColor: Color {
    isDark ? Color(white: 0.1) : Color(white: 0.98)
  }

  private var cardColor: Color {
    isDark ? Color(white: 0.2) : .white
  }

  private var textColor: Color {
    isDark ? .white : .black
  }

  private var secondaryTextColor: Color {
    isDark ? Color(white: 0.6) : Color(white: 0.4)
  }

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.xs) {
      // Preview window
      VStack(spacing: 6) {
        // Header bar
        HStack {
          Circle()
            .fill(isDark ? DesignTokens.Colors.accent.opacity(0.8) : DesignTokens.Colors.accent)
            .frame(width: 20, height: 20)

          VStack(alignment: .leading, spacing: 2) {
            RoundedRectangle(cornerRadius: 2)
              .fill(textColor.opacity(0.8))
              .frame(width: 50, height: 6)

            RoundedRectangle(cornerRadius: 2)
              .fill(secondaryTextColor.opacity(0.5))
              .frame(width: 30, height: 4)
          }

          Spacer()
        }
        .padding(.horizontal, 8)
        .padding(.top, 8)

        // Content cards
        VStack(spacing: 4) {
          RoundedRectangle(cornerRadius: 4)
            .fill(cardColor)
            .frame(height: 24)
            .shadow(color: .black.opacity(isDark ? 0.3 : 0.1), radius: 2, y: 1)

          RoundedRectangle(cornerRadius: 4)
            .fill(cardColor)
            .frame(height: 24)
            .shadow(color: .black.opacity(isDark ? 0.3 : 0.1), radius: 2, y: 1)
        }
        .padding(.horizontal, 8)
        .padding(.bottom, 8)
      }
      .frame(maxWidth: .infinity)
      .background(backgroundColor)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
      .overlay(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
          .stroke(isActive ? Color.accentColor : Color.clear, lineWidth: 2)
      )
      .shadow(color: .black.opacity(0.1), radius: 4, y: 2)

      // Label
      Text(title)
        .font(.caption)
        .fontWeight(isActive ? .semibold : .regular)
        .foregroundStyle(isActive ? .primary : .secondary)

      // Active indicator
      if isActive {
        Image(systemName: "checkmark.circle.fill")
          .font(.caption)
          .foregroundStyle(.green)
      } else {
        Circle()
          .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
          .frame(width: 14, height: 14)
      }
    }
    .frame(maxWidth: .infinity)
  }
}

// MARK: - Theme Mode Row

struct ThemeModeRow: View {
  let mode: ThemeMode
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        // Icon
        ZStack {
          Circle()
            .fill(mode.iconColor.opacity(0.15))
            .frame(width: 36, height: 36)

          Image(systemName: mode.icon)
            .font(.body)
            .foregroundStyle(mode.iconColor)
        }

        // Text
        VStack(alignment: .leading, spacing: 2) {
          Text(mode.displayName)
            .font(.body)
            .foregroundStyle(.primary)

          Text(modeDescription)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        // Selection indicator
        if isSelected {
          Image(systemName: "checkmark.circle.fill")
            .font(.title3)
            .foregroundStyle(.green)
            .transition(.scale.combined(with: .opacity))
        }
      }
      .padding(.vertical, DesignTokens.Spacing.xxs)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
  }

  private var modeDescription: String {
    switch mode {
    case .system:
      return "theme.system_description".localized
    case .light:
      return "theme.light_description".localized
    case .dark:
      return "theme.dark_description".localized
    }
  }
}

#Preview {
  ProfileView()
    .environment(ThemeManager.shared)
}
