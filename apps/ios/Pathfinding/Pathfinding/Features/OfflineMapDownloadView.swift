import SwiftUI

/// Detailed view for a single region download with progress
struct OfflineMapDownloadView: View {
  let region: OfflineMapRegion
  @State private var manager = OfflineMapManager.shared
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: DesignTokens.Spacing.xl) {
          // Map preview header
          MapPreviewHeader(region: region)

          // Download status card
          DownloadStatusCard(region: currentRegion)

          // Region details
          RegionDetailsCard(region: region)

          // Action buttons
          ActionButtonsSection(
            region: currentRegion,
            onDownload: {
              Task {
                await manager.startDownload(regionId: region.id)
              }
            },
            onPause: {
              Task {
                await manager.pauseDownload(regionId: region.id)
              }
            },
            onResume: {
              Task {
                await manager.resumeDownload(regionId: region.id)
              }
            },
            onCancel: {
              Task {
                await manager.cancelDownload(regionId: region.id)
              }
            },
            onDelete: {
              Task {
                await manager.deleteRegion(regionId: region.id)
                dismiss()
              }
            }
          )

          Spacer(minLength: 40)
        }
        .padding()
      }
      .navigationTitle(region.localizedName)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") {
            dismiss()
          }
        }
      }
    }
  }

  private var currentRegion: OfflineMapRegion {
    manager.region(for: region.id) ?? region
  }
}

// MARK: - Map Preview Header

struct MapPreviewHeader: View {
  let region: OfflineMapRegion

  var body: some View {
    ZStack {
      // Background gradient representing map
      RoundedRectangle(cornerRadius: 16)
        .fill(
          LinearGradient(
            colors: [.indigo.opacity(0.3), .purple.opacity(0.2)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
        )
        .frame(height: 180)

      // Grid pattern to simulate map
      GridPattern()
        .stroke(Color.white.opacity(0.3), lineWidth: 0.5)
        .frame(height: 180)
        .clipShape(RoundedRectangle(cornerRadius: 16))

      // City info overlay
      VStack(spacing: 8) {
        Image(systemName: "mappin.circle.fill")
          .font(.system(size: 44))
          .foregroundStyle(.white)
          .shadow(color: .black.opacity(0.3), radius: 4)

        Text(region.localizedName)
          .font(.title2)
          .fontWeight(.bold)
          .foregroundStyle(.white)
          .shadow(color: .black.opacity(0.3), radius: 2)

        if let province = region.province {
          Text(province)
            .font(.subheadline)
            .foregroundStyle(.white.opacity(0.9))
            .shadow(color: .black.opacity(0.3), radius: 2)
        }
      }
    }
  }
}

// MARK: - Grid Pattern

struct GridPattern: Shape {
  func path(in rect: CGRect) -> Path {
    var path = Path()
    let spacing: CGFloat = 20

    // Vertical lines
    for x in stride(from: 0, through: rect.width, by: spacing) {
      path.move(to: CGPoint(x: x, y: 0))
      path.addLine(to: CGPoint(x: x, y: rect.height))
    }

    // Horizontal lines
    for y in stride(from: 0, through: rect.height, by: spacing) {
      path.move(to: CGPoint(x: 0, y: y))
      path.addLine(to: CGPoint(x: rect.width, y: y))
    }

    return path
  }
}

// MARK: - Download Status Card

struct DownloadStatusCard: View {
  let region: OfflineMapRegion

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Status header
      HStack {
        statusIcon
        Text(statusText)
          .font(.headline)
        Spacer()
      }

      // Progress bar (if downloading)
      if region.isDownloading || region.downloadState == .updating {
        VStack(spacing: 8) {
          ProgressView(value: region.downloadProgress)
            .tint(.indigo)

          HStack {
            Text("\(Int(region.downloadProgress * 100))%")
              .font(.caption)
              .foregroundStyle(.secondary)

            Spacer()

            Text("\(region.downloadedTiles) / \(region.totalTiles) 瓦片")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }

      // Size info
      HStack {
        Label {
          if region.isDownloaded {
            Text("已下载 \(region.formattedSize)")
          } else {
            Text("预计大小 \(region.formattedSize)")
          }
        } icon: {
          Image(systemName: "internaldrive")
        }
        .font(.subheadline)
        .foregroundStyle(.secondary)

        Spacer()

        if let lastUpdated = region.lastUpdated {
          Text("更新于 \(lastUpdated, style: .relative)")
            .font(.caption)
            .foregroundStyle(.tertiary)
        }
      }
    }
    .padding()
    .background(Color(.systemGray6))
    .clipShape(RoundedRectangle(cornerRadius: 12))
  }

  @ViewBuilder
  private var statusIcon: some View {
    switch region.downloadState {
    case .notDownloaded:
      Image(systemName: "arrow.down.circle")
        .foregroundStyle(.secondary)
    case .downloading:
      ProgressView()
        .controlSize(.small)
    case .paused:
      Image(systemName: "pause.circle.fill")
        .foregroundStyle(.orange)
    case .downloaded:
      Image(systemName: "checkmark.circle.fill")
        .foregroundStyle(.green)
    case .failed:
      Image(systemName: "exclamationmark.circle.fill")
        .foregroundStyle(.red)
    case .updating:
      ProgressView()
        .controlSize(.small)
    }
  }

  private var statusText: String {
    switch region.downloadState {
    case .notDownloaded:
      return "未下载"
    case .downloading:
      return "下载中..."
    case .paused:
      return "已暂停"
    case .downloaded:
      return "已下载"
    case .failed:
      return "下载失败"
    case .updating:
      return "更新中..."
    }
  }
}

// MARK: - Region Details Card

struct RegionDetailsCard: View {
  let region: OfflineMapRegion

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Text("地图详情")
        .font(.headline)

      VStack(spacing: DesignTokens.Spacing.sm) {
        DetailRow(label: "城市", value: region.localizedName)
        DetailRow(label: "英文名", value: region.name)
        if let province = region.province {
          DetailRow(label: "省份", value: province)
        }
        DetailRow(label: "缩放级别", value: "\(region.minZoom) - \(region.maxZoom)")
        DetailRow(
          label: "覆盖范围",
          value: String(format: "%.2f° x %.2f°",
                        region.boundingBox.maxLat - region.boundingBox.minLat,
                        region.boundingBox.maxLon - region.boundingBox.minLon)
        )
        DetailRow(
          label: "中心坐标",
          value: String(format: "%.4f, %.4f",
                        region.center.latitude,
                        region.center.longitude)
        )
      }
    }
    .padding()
    .background(Color(.systemGray6))
    .clipShape(RoundedRectangle(cornerRadius: 12))
  }
}

// MARK: - Detail Row

struct DetailRow: View {
  let label: String
  let value: String

  var body: some View {
    HStack {
      Text(label)
        .foregroundStyle(.secondary)
      Spacer()
      Text(value)
        .fontWeight(.medium)
    }
    .font(.subheadline)
  }
}

// MARK: - Action Buttons Section

struct ActionButtonsSection: View {
  let region: OfflineMapRegion
  let onDownload: () -> Void
  let onPause: () -> Void
  let onResume: () -> Void
  let onCancel: () -> Void
  let onDelete: () -> Void

  @State private var showDeleteConfirmation = false

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      switch region.downloadState {
      case .notDownloaded, .failed:
        Button {
          onDownload()
        } label: {
          Label("下载离线地图", systemImage: "arrow.down.circle.fill")
            .frame(maxWidth: .infinity)
            .padding()
            .background(DesignTokens.Colors.accent)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }

      case .downloading:
        HStack(spacing: DesignTokens.Spacing.sm) {
          Button {
            onPause()
          } label: {
            Label("暂停", systemImage: "pause.fill")
              .frame(maxWidth: .infinity)
              .padding()
              .background(Color.orange)
              .foregroundStyle(.white)
              .clipShape(RoundedRectangle(cornerRadius: 12))
          }

          Button {
            onCancel()
          } label: {
            Label("取消", systemImage: "xmark")
              .frame(maxWidth: .infinity)
              .padding()
              .background(Color(.systemGray5))
              .foregroundStyle(.primary)
              .clipShape(RoundedRectangle(cornerRadius: 12))
          }
        }

      case .paused:
        HStack(spacing: DesignTokens.Spacing.sm) {
          Button {
            onResume()
          } label: {
            Label("继续", systemImage: "play.fill")
              .frame(maxWidth: .infinity)
              .padding()
              .background(DesignTokens.Colors.accent)
              .foregroundStyle(.white)
              .clipShape(RoundedRectangle(cornerRadius: 12))
          }

          Button {
            onCancel()
          } label: {
            Label("取消", systemImage: "xmark")
              .frame(maxWidth: .infinity)
              .padding()
              .background(Color(.systemGray5))
              .foregroundStyle(.primary)
              .clipShape(RoundedRectangle(cornerRadius: 12))
          }
        }

      case .downloaded:
        Button(role: .destructive) {
          showDeleteConfirmation = true
        } label: {
          Label("删除离线地图", systemImage: "trash")
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.red.opacity(0.1))
            .foregroundStyle(.red)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }

      case .updating:
        Button {
          onCancel()
        } label: {
          Label("取消更新", systemImage: "xmark")
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemGray5))
            .foregroundStyle(.primary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
      }
    }
    .alert("删除离线地图", isPresented: $showDeleteConfirmation) {
      Button("取消", role: .cancel) {}
      Button("删除", role: .destructive) {
        onDelete()
      }
    } message: {
      Text("确定要删除「\(region.localizedName)」的离线地图吗？")
    }
  }
}

// MARK: - Preview

#Preview {
  OfflineMapDownloadView(region: OfflineMapRegion.popularCities[0])
}
