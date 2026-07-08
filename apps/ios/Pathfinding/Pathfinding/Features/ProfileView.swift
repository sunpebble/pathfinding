import SwiftUI

struct ProfileView: View {
  @EnvironmentObject private var authViewModel: AuthViewModel
  @Environment(ThemeManager.self) private var themeManager
  @Environment(\.localizationManager) private var localizationManager
  @State private var showLogin = false
  @State private var footprintStore = FootprintStore.shared

  /// Whether user is logged in (not guest mode)
  private var isLoggedIn: Bool {
    authViewModel.isAuthenticated && !authViewModel.isGuestMode
  }

  var body: some View {
    NavigationStack {
      List {
        // MARK: - Glass Hero (scrolls with content; pinned variant hid rows and ate scroll gestures)
        Section {
          heroView
        }
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets())

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

          #if DEBUG
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
          #endif

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
      .sheet(isPresented: $showLogin) {
        LoginView()
      }
      .task {
        await footprintStore.loadVisitedCities()
      }
    }
  }

  // MARK: - Glass Hero

  private var heroView: some View {
    GlassEffectContainer {
      VStack(spacing: DesignTokens.Spacing.md) {
        // Avatar + name row — whole row opens login when signed out (one affordance, not two)
        headerIdentityRow

        Divider()

        // Stats row inline
        HStack(spacing: 0) {
          EnhancedStatItem(
            value: "\(footprintStore.visitedCities.count)",
            label: "profile.footprints".localized,
            icon: "shoeprints.fill",
            color: DesignTokens.Colors.Terrain.forest,
            index: 0,
            isLoading: footprintStore.isLoadingCities
          )
        }
      }
      .padding(DesignTokens.Spacing.md)
      .cardSurface()
    }
  }

  // MARK: - Header Identity Row

  /// Avatar + name + subtitle. When signed out the whole row is a single
  /// tappable sign-in affordance, replacing the previous redundant prompt + button.
  @ViewBuilder
  private var headerIdentityRow: some View {
    let displayName = isLoggedIn
      ? (authViewModel.userEmail ?? "User")
      : "profile.guest".localized
    let subtitle = isLoggedIn
      ? "profile.logged_in".localized
      : "profile.login_prompt".localized

    let row = HStack(spacing: DesignTokens.Spacing.lg) {
      Image(systemName: "person.fill")
        .font(.system(size: 32, weight: .medium))
        .foregroundStyle(.white)
        .padding(DesignTokens.Spacing.lg)
        .glassEffect(.regular.tint(.purple.opacity(0.25)), in: Circle())

      VStack(alignment: .leading, spacing: 6) {
        Text(displayName)
          .font(.title2)
          .fontWeight(.bold)
          .foregroundStyle(.primary)
        Text(subtitle)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }

      Spacer()

      if !isLoggedIn {
        Image(systemName: "chevron.right")
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(.secondary)
      }
    }
    .contentShape(Rectangle())

    if isLoggedIn {
      row
    } else {
      Button {
        showLogin = true
      } label: {
        row
      }
      .buttonStyle(.plain)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel("\(displayName). \(subtitle)")
      .accessibilityAddTraits(.isButton)
    }
  }

}

#Preview {
  ProfileView()
    .environment(ThemeManager.shared)
}
