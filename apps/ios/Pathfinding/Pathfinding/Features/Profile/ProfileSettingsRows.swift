import SwiftUI

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
