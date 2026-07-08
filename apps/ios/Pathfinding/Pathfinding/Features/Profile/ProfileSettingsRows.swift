import SwiftUI

// MARK: - Explorer Settings Row

struct ExplorerSettingsRow: View {
  let icon: String
  let title: String
  let subtitle: String
  let iconColor: Color
  var terrainColor: Color = .clear  // kept for call-site compat, unused
  var showChevron: Bool = false     // kept for call-site compat, unused (NavigationLink provides disclosure)

  var body: some View {
    Label {
      VStack(alignment: .leading, spacing: 3) {
        Text(title)
          .foregroundStyle(.primary)
        Text(subtitle)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
    } icon: {
      Image(systemName: icon)
        .font(.system(size: 15, weight: .semibold))
        .foregroundStyle(Sunpebble.onPrimary)
        .frame(width: 30, height: 30)
        .background(Sunpebble.primaryFill, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
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

// MARK: - Offline Map Settings Row

struct OfflineMapSettingsRow: View {
  @State private var manager = OfflineMapManager.shared

  private let mapColor = DesignTokens.Colors.Terrain.forest

  var body: some View {
    Label {
      VStack(alignment: .leading, spacing: 3) {
        HStack {
          VStack(alignment: .leading, spacing: 3) {
            Text("profile.offline_maps".localized)
              .foregroundStyle(.primary)
            Text(subtitleText)
              .font(.caption)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }

          Spacer()

          if !manager.downloadedRegions.isEmpty {
            Text("\(manager.downloadedRegions.count)")
              .font(.caption2)
              .fontWeight(.semibold)
              .foregroundStyle(.white)
              .padding(.horizontal, 8)
              .padding(.vertical, 4)
              .background(mapColor, in: Capsule())
          }
        }
      }
    } icon: {
      Image(systemName: "map.fill")
        .font(.system(size: 15, weight: .semibold))
        .foregroundStyle(Sunpebble.onPrimary)
        .frame(width: 30, height: 30)
        .background(Sunpebble.primaryFill, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
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
  var showChevron: Bool = false  // kept for call-site compat, unused

  var body: some View {
    Label {
      VStack(alignment: .leading, spacing: 3) {
        HStack {
          VStack(alignment: .leading, spacing: 3) {
            Text("profile.icloud_sync".localized)
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
          }
        }
      }
    } icon: {
      Image(systemName: syncStatusIcon)
        .font(.system(size: 15, weight: .semibold))
        .foregroundStyle(Sunpebble.onPrimary)
        .symbolEffect(.pulse, isActive: syncManager.syncStatus == .syncing)
        .frame(width: 30, height: 30)
        .background(syncStatusTint, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
  }

  /// 状态色信号（保留语义）：错误红 / 成功绿 / 同步中阳光 / 空闲·停用墨色。
  private var syncStatusTint: Color {
    guard syncManager.isSyncEnabled else { return Sunpebble.primaryFill }
    switch syncManager.syncStatus {
    case .error: return DesignTokens.Colors.error
    case .success: return DesignTokens.Colors.success
    case .syncing: return DesignTokens.Colors.accent
    case .idle: return Sunpebble.primaryFill
    }
  }

  private var syncStatusIcon: String {
    if !syncManager.isSyncEnabled {
      return "icloud.slash"
    }
    return syncManager.syncStatus.icon
  }

  private var syncStatusText: String {
    if !syncManager.isSyncEnabled {
      return "icloud.sync.disabled".localized
    }
    return syncManager.syncStatus.displayText
  }
}
