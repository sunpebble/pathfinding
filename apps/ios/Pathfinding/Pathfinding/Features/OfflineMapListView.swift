import SwiftUI

/// View for managing offline maps - listing available and downloaded regions
struct OfflineMapListView: View {
  @State private var manager = OfflineMapManager.shared
  @State private var searchText = ""
  @State private var selectedTab: MapListTab = .available
  @State private var showDeleteAllConfirmation = false
  @State private var regionToDelete: OfflineMapRegion?

  enum MapListTab: String, CaseIterable {
    case available
    case downloaded

    var displayName: String {
      switch self {
      case .available: return "offlinemap.tab_available".localized
      case .downloaded: return "offlinemap.tab_downloaded".localized
      }
    }
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        // Tab picker
        Picker("", selection: $selectedTab) {
          ForEach(MapListTab.allCases, id: \.self) { tab in
            Text(tab.displayName).tag(tab)
          }
        }
        .pickerStyle(.segmented)
        .padding()

        // Storage info bar
        StorageInfoBar(
          used: manager.totalStorageUsed,
          available: manager.availableStorage
        )

        // Content
        if manager.isLoading {
          Spacer()
          ProgressView("common.loading".localized)
          Spacer()
        } else {
          switch selectedTab {
          case .available:
            AvailableRegionsListView(
              regions: filteredAvailableRegions,
              searchText: $searchText,
              onDownload: { region in
                Task {
                  await manager.startDownload(regionId: region.id)
                }
              },
              onCancel: { region in
                Task {
                  await manager.cancelDownload(regionId: region.id)
                }
              }
            )

          case .downloaded:
            DownloadedRegionsListView(
              regions: manager.downloadedRegions,
              onDelete: { region in
                regionToDelete = region
              },
              onUpdate: { region in
                Task {
                  await manager.updateRegion(regionId: region.id)
                }
              }
            )
          }
        }
      }
      .sunpebbleCanvas()
      .navigationTitle("map.offline".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        if selectedTab == .downloaded && !manager.downloadedRegions.isEmpty {
          ToolbarItem(placement: .topBarTrailing) {
            Button("offlinemap.delete_all".localized) {
              showDeleteAllConfirmation = true
            }
            .foregroundStyle(.red)
          }
        }
      }
      .alert("offlinemap.delete_alert_title".localized, isPresented: .init(
        get: { regionToDelete != nil },
        set: { if !$0 { regionToDelete = nil } }
      )) {
        Button("common.cancel".localized, role: .cancel) {
          regionToDelete = nil
        }
        Button("common.delete".localized, role: .destructive) {
          if let region = regionToDelete {
            Task {
              await manager.deleteRegion(regionId: region.id)
            }
          }
          regionToDelete = nil
        }
      } message: {
        if let region = regionToDelete {
          Text("offlinemap.delete_confirm_message".localized(region.localizedName))
        }
      }
      .alert("offlinemap.delete_all_alert_title".localized, isPresented: $showDeleteAllConfirmation) {
        Button("common.cancel".localized, role: .cancel) {}
        Button("offlinemap.delete_all".localized, role: .destructive) {
          Task {
            await manager.deleteAllRegions()
          }
        }
      } message: {
        Text("offlinemap.delete_all_message".localized)
      }
      .refreshable {
        manager.loadRegions()
      }
    }
  }

  private var filteredAvailableRegions: [OfflineMapRegion] {
    let available = manager.regions.filter { !$0.isDownloaded }
    if searchText.isEmpty {
      return available
    }
    return available.filter {
      $0.localizedName.localizedCaseInsensitiveContains(searchText) ||
      $0.name.localizedCaseInsensitiveContains(searchText) ||
      ($0.province?.localizedCaseInsensitiveContains(searchText) ?? false)
    }
  }
}

// MARK: - Storage Info Bar

struct StorageInfoBar: View {
  let used: Int64
  let available: Int64

  var body: some View {
    HStack {
      Label {
        Text("offlinemap.storage_used".localized(ByteCountFormatter.string(fromByteCount: used, countStyle: .file)))
          .font(.caption)
      } icon: {
        Image(systemName: "internaldrive")
          .font(.caption)
      }

      Spacer()

      Label {
        Text("offlinemap.storage_available".localized(ByteCountFormatter.string(fromByteCount: available, countStyle: .file)))
          .font(.caption)
      } icon: {
        Image(systemName: "externaldrive")
          .font(.caption)
      }
    }
    .foregroundStyle(.secondary)
    .padding(.horizontal)
    .padding(.vertical, 8)
    .background(DesignTokens.Colors.backgroundSecondary)
  }
}

// MARK: - Available Regions List

struct AvailableRegionsListView: View {
  let regions: [OfflineMapRegion]
  @Binding var searchText: String
  let onDownload: (OfflineMapRegion) -> Void
  let onCancel: (OfflineMapRegion) -> Void

  var body: some View {
    List {
      // Search bar
      Section {
        HStack {
          Image(systemName: "magnifyingglass")
            .foregroundStyle(.secondary)
          TextField("offlinemap.search_placeholder".localized, text: $searchText)
            .textFieldStyle(.plain)
          if !searchText.isEmpty {
            Button {
              searchText = ""
            } label: {
              Image(systemName: "xmark.circle.fill")
                .foregroundStyle(.secondary)
            }
          }
        }
      }

      // Grouped by province
      ForEach(groupedRegions.keys.sorted(), id: \.self) { province in
        Section(province) {
          ForEach(groupedRegions[province] ?? []) { region in
            AvailableRegionRow(
              region: region,
              onDownload: { onDownload(region) },
              onCancel: { onCancel(region) }
            )
          }
        }
      }

      if regions.isEmpty {
        Section {
          ContentUnavailableView(
            "offlinemap.no_cities_found".localized,
            systemImage: "map",
            description: Text("offlinemap.try_other_search".localized)
          )
        }
      }
    }
    .listStyle(.insetGrouped)
  }

  private var groupedRegions: [String: [OfflineMapRegion]] {
    Dictionary(grouping: regions, by: { $0.province ?? "poi.other".localized })
  }
}

// MARK: - Available Region Row

struct AvailableRegionRow: View {
  let region: OfflineMapRegion
  let onDownload: () -> Void
  let onCancel: () -> Void

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // City icon
      ZStack {
        Circle()
          .fill(DesignTokens.Colors.accent.opacity(0.1))
          .frame(width: 44, height: 44)

        Image(systemName: "building.2")
          .font(.title3)
          .foregroundStyle(DesignTokens.Colors.accent)
      }

      // Info
      VStack(alignment: .leading, spacing: 4) {
        Text(region.localizedName)
          .font(.body)
          .fontWeight(.medium)

        HStack(spacing: DesignTokens.Spacing.xs) {
          Text("offlinemap.approx_size".localized(region.formattedSize))
            .font(.caption)
            .foregroundStyle(.secondary)

          Text("·")
            .foregroundStyle(.secondary)

          Text("offlinemap.zoom_range".localized(region.minZoom, region.maxZoom))
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      Spacer()

      // Action button
      switch region.downloadState {
      case .notDownloaded, .failed:
        Button {
          onDownload()
        } label: {
          Image(systemName: "arrow.down.circle.fill")
            .font(.title2)
            .foregroundStyle(DesignTokens.Colors.accent)
        }

      case .downloading:
        DownloadProgressButton(
          progress: region.downloadProgress,
          onCancel: onCancel
        )

      case .paused:
        Button {
          onDownload()
        } label: {
          Image(systemName: "play.circle.fill")
            .font(.title2)
            .foregroundStyle(.orange)
        }

      case .downloaded, .updating:
        Image(systemName: "checkmark.circle.fill")
          .font(.title2)
          .foregroundStyle(.green)
      }
    }
    .padding(.vertical, 4)
  }
}

// MARK: - Download Progress Button

struct DownloadProgressButton: View {
  let progress: Double
  let onCancel: () -> Void

  var body: some View {
    Button {
      onCancel()
    } label: {
      ZStack {
        Circle()
          .stroke(DesignTokens.Colors.border, lineWidth: 3)
          .frame(width: 32, height: 32)

        Circle()
          .trim(from: 0, to: progress)
          .stroke(DesignTokens.Colors.accent, style: StrokeStyle(lineWidth: 3, lineCap: .round))
          .frame(width: 32, height: 32)
          .rotationEffect(.degrees(-90))

        Image(systemName: "stop.fill")
          .font(.caption2)
          .foregroundStyle(DesignTokens.Colors.accent)
      }
    }
  }
}

// MARK: - Downloaded Regions List

struct DownloadedRegionsListView: View {
  let regions: [OfflineMapRegion]
  let onDelete: (OfflineMapRegion) -> Void
  let onUpdate: (OfflineMapRegion) -> Void

  var body: some View {
    if regions.isEmpty {
      ContentUnavailableView(
        "offlinemap.empty_title".localized,
        systemImage: "map",
        description: Text("offlinemap.empty_hint".localized)
      )
    } else {
      List {
        ForEach(regions) { region in
          DownloadedRegionRow(
            region: region,
            onDelete: { onDelete(region) },
            onUpdate: { onUpdate(region) }
          )
        }
      }
      .listStyle(.insetGrouped)
    }
  }
}

// MARK: - Downloaded Region Row

struct DownloadedRegionRow: View {
  let region: OfflineMapRegion
  let onDelete: () -> Void
  let onUpdate: () -> Void

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // City icon with checkmark
      ZStack {
        Circle()
          .fill(Color.green.opacity(0.1))
          .frame(width: 44, height: 44)

        Image(systemName: "map.fill")
          .font(.title3)
          .foregroundStyle(.green)
      }

      // Info
      VStack(alignment: .leading, spacing: 4) {
        Text(region.localizedName)
          .font(.body)
          .fontWeight(.medium)

        HStack(spacing: DesignTokens.Spacing.xs) {
          Text(region.formattedSize)
            .font(.caption)
            .foregroundStyle(.secondary)

          if let lastUpdated = region.lastUpdated {
            Text("·")
              .foregroundStyle(.secondary)

            Text(lastUpdated, style: .relative)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }

      Spacer()

      // Actions menu
      Menu {
        Button {
          onUpdate()
        } label: {
          Label("offlinemap.update".localized, systemImage: "arrow.clockwise")
        }

        Button(role: .destructive) {
          onDelete()
        } label: {
          Label("common.delete".localized, systemImage: "trash")
        }
      } label: {
        Image(systemName: "ellipsis.circle")
          .font(.title2)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.vertical, 4)
  }
}

// MARK: - Preview

#Preview {
  OfflineMapListView()
}
