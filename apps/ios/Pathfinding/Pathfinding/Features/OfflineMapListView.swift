import SwiftUI

/// View for managing offline maps - listing available and downloaded regions
struct OfflineMapListView: View {
  @State private var manager = OfflineMapManager.shared
  @State private var searchText = ""
  @State private var selectedTab: MapListTab = .available
  @State private var showDeleteAllConfirmation = false
  @State private var regionToDelete: OfflineMapRegion?

  enum MapListTab: String, CaseIterable {
    case available = "可下载"
    case downloaded = "已下载"
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        // Tab picker
        Picker("", selection: $selectedTab) {
          ForEach(MapListTab.allCases, id: \.self) { tab in
            Text(tab.rawValue).tag(tab)
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
          ProgressView("加载中...")
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
      .navigationTitle("离线地图")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        if selectedTab == .downloaded && !manager.downloadedRegions.isEmpty {
          ToolbarItem(placement: .topBarTrailing) {
            Button("全部删除") {
              showDeleteAllConfirmation = true
            }
            .foregroundStyle(.red)
          }
        }
      }
      .alert("删除离线地图", isPresented: .init(
        get: { regionToDelete != nil },
        set: { if !$0 { regionToDelete = nil } }
      )) {
        Button("取消", role: .cancel) {
          regionToDelete = nil
        }
        Button("删除", role: .destructive) {
          if let region = regionToDelete {
            Task {
              await manager.deleteRegion(regionId: region.id)
            }
          }
          regionToDelete = nil
        }
      } message: {
        if let region = regionToDelete {
          Text("确定要删除「\(region.localizedName)」的离线地图吗？")
        }
      }
      .alert("删除全部离线地图", isPresented: $showDeleteAllConfirmation) {
        Button("取消", role: .cancel) {}
        Button("全部删除", role: .destructive) {
          Task {
            await manager.deleteAllRegions()
          }
        }
      } message: {
        Text("确定要删除所有已下载的离线地图吗？此操作无法撤销。")
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
        Text("已用: \(ByteCountFormatter.string(fromByteCount: used, countStyle: .file))")
          .font(.caption)
      } icon: {
        Image(systemName: "internaldrive")
          .font(.caption)
      }

      Spacer()

      Label {
        Text("可用: \(ByteCountFormatter.string(fromByteCount: available, countStyle: .file))")
          .font(.caption)
      } icon: {
        Image(systemName: "externaldrive")
          .font(.caption)
      }
    }
    .foregroundStyle(.secondary)
    .padding(.horizontal)
    .padding(.vertical, 8)
    .background(Color(.systemGray6))
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
          TextField("搜索城市", text: $searchText)
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
            "没有找到城市",
            systemImage: "map",
            description: Text("尝试其他搜索词")
          )
        }
      }
    }
    .listStyle(.insetGrouped)
  }

  private var groupedRegions: [String: [OfflineMapRegion]] {
    Dictionary(grouping: regions, by: { $0.province ?? "其他" })
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
          Text("约 \(region.formattedSize)")
            .font(.caption)
            .foregroundStyle(.secondary)

          Text("·")
            .foregroundStyle(.secondary)

          Text("缩放 \(region.minZoom)-\(region.maxZoom)")
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
          .stroke(Color.gray.opacity(0.3), lineWidth: 3)
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
        "暂无离线地图",
        systemImage: "map",
        description: Text("下载离线地图后可在无网络时使用")
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
          Label("更新", systemImage: "arrow.clockwise")
        }

        Button(role: .destructive) {
          onDelete()
        } label: {
          Label("删除", systemImage: "trash")
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
